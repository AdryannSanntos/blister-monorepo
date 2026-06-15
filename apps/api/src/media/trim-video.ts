import { spawn } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { resolveFfmpegPath } from './resolve-ffmpeg-path';

export type TrimVideoParams = {
  inputUrl: string;
  startSec: number;
  endSec: number;
  ffmpegPath?: string;
};

const buildFfmpegNotFoundError = (ffmpegPath: string): Error =>
  new Error(
    `FFmpeg binary not found at "${ffmpegPath}". Install ffmpeg on PATH, set FFMPEG_PATH, or ensure ffmpeg-static is installed.`,
  );

/** Trims a remote or local video segment via FFmpeg (re-encode for stable playback). */
export const trimVideoToBuffer = async (params: TrimVideoParams): Promise<Buffer> => {
  const workDir = join(tmpdir(), `blister-cut-${randomUUID()}`);
  const outputPath = join(workDir, 'clip.mp4');
  const durationSec = Math.max(0.1, params.endSec - params.startSec);
  const ffmpeg = params.ffmpegPath ?? resolveFfmpegPath();

  await mkdir(workDir, { recursive: true });

  try {
    await new Promise<void>((resolve, reject) => {
      const args = [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-ss',
        String(params.startSec),
        '-i',
        params.inputUrl,
        '-t',
        String(durationSec),
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '23',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        outputPath,
      ];

      const proc = spawn(ffmpeg, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';

      proc.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on('error', (error) => {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(buildFfmpegNotFoundError(ffmpeg));
          return;
        }
        reject(error);
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(stderr.trim() || `FFmpeg exited with code ${code}`));
      });
    });

    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
};
