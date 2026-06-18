import { spawn } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { resolveFfmpegPath } from './resolve-ffmpeg-path';

export type TrimVideoParams = {
  /** Remote HTTP(S) URL — prefer `inputPath` for large local/S3 files. */
  inputUrl?: string;
  /** Local filesystem path to the source video. */
  inputPath?: string;
  startSec: number;
  endSec: number;
  ffmpegPath?: string;
  /** Kill FFmpeg if it exceeds this duration (default 15 minutes). */
  timeoutMs?: number;
};

const DEFAULT_FFMPEG_TIMEOUT_MS = 15 * 60 * 1000;

const buildFfmpegNotFoundError = (ffmpegPath: string): Error =>
  new Error(
    `FFmpeg binary not found at "${ffmpegPath}". Install ffmpeg on PATH, set FFMPEG_PATH, or ensure ffmpeg-static is installed.`,
  );

const buildFfmpegFailureError = (
  ffmpeg: string,
  code: number | null,
  signal: NodeJS.Signals | null,
  stderr: string,
): Error => {
  if (signal) {
    const hint =
      signal === 'SIGKILL'
        ? ' Process was likely killed (out of memory or platform limit). Try a larger Trigger machine or trim from a local file copy.'
        : '';
    return new Error(
      `FFmpeg at "${ffmpeg}" was killed by signal ${signal}.${hint}${
        stderr.trim() ? ` FFmpeg stderr: ${stderr.trim()}` : ''
      }`,
    );
  }

  return new Error(
    stderr.trim() || `FFmpeg at "${ffmpeg}" exited with code ${code ?? 'unknown'}`,
  );
};

/** Trims a remote or local video segment via FFmpeg (re-encode for stable playback). */
export const trimVideoToBuffer = async (params: TrimVideoParams): Promise<Buffer> => {
  const input = params.inputPath ?? params.inputUrl;
  if (!input) {
    throw new Error('trimVideoToBuffer requires inputPath or inputUrl');
  }

  const workDir = join(tmpdir(), `blister-cut-${randomUUID()}`);
  const outputPath = join(workDir, 'clip.mp4');
  const durationSec = Math.max(0.1, params.endSec - params.startSec);
  const ffmpeg = params.ffmpegPath ?? resolveFfmpegPath();
  const timeoutMs = params.timeoutMs ?? DEFAULT_FFMPEG_TIMEOUT_MS;

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
        input,
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
      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        proc.kill('SIGKILL');
        reject(
          new Error(
            `FFmpeg timed out after ${timeoutMs}ms while trimming segment ${params.startSec}s–${params.endSec}s`,
          ),
        );
      }, timeoutMs);

      proc.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on('error', (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(buildFfmpegNotFoundError(ffmpeg));
          return;
        }
        reject(error);
      });

      proc.on('close', (code, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (code === 0) {
          resolve();
          return;
        }
        reject(buildFfmpegFailureError(ffmpeg, code, signal, stderr));
      });
    });

    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
};
