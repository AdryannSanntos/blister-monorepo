import { accessSync, constants } from 'node:fs';
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';

import {
  resetFfmpegPathCacheForTests,
  resolveFfmpegPath,
} from './resolve-ffmpeg-path';
import { trimVideoToBuffer } from './trim-video';

jest.mock('node:child_process', () => ({
  spawn: jest.fn(),
}));

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('clip-bytes')),
  rm: jest.fn().mockResolvedValue(undefined),
}));

describe('resolveFfmpegPath', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.FFMPEG_PATH;
    delete process.env.FFMPEG_BINARY;
    delete process.env.TRIGGER_RUN_ID;
    delete process.env.TRIGGER_ATTEMPT_ID;
    resetFfmpegPathCacheForTests();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('prefers FFMPEG_PATH when set', () => {
    process.env.FFMPEG_PATH = '/opt/ffmpeg';
    expect(resolveFfmpegPath()).toBe('/opt/ffmpeg');
  });

  it('uses bundled ffmpeg-static when available', () => {
    const path = resolveFfmpegPath();
    if (path === 'ffmpeg') {
      // Package not installed in this environment — still a valid fallback string.
      expect(path).toBe('ffmpeg');
      return;
    }

    expect(() => accessSync(path, constants.X_OK)).not.toThrow();
  });

  it('falls back to ffmpeg-static in local Trigger worker when /usr/bin/ffmpeg is absent', () => {
    process.env.TRIGGER_RUN_ID = 'run_test';

    const path = resolveFfmpegPath();
    if (path === 'ffmpeg') {
      expect(path).toBe('ffmpeg');
      return;
    }

    expect(() => accessSync(path, constants.X_OK)).not.toThrow();
    expect(path).not.toBe('/usr/bin/ffmpeg');
  });
});

describe('trimVideoToBuffer', () => {
  it('spawns ffmpeg with segment args and returns output buffer', async () => {
    const spawnMock = spawn as jest.MockedFunction<typeof spawn>;
    spawnMock.mockImplementation(() => {
      return {
        stderr: { on: jest.fn() },
        on: (event: string, handler: (value?: unknown) => void) => {
          if (event === 'close') {
            queueMicrotask(() => handler(0));
          }
        },
      } as unknown as ReturnType<typeof spawn>;
    });

    const buffer = await trimVideoToBuffer({
      inputPath: '/tmp/source.mp4',
      startSec: 10,
      endSec: 40,
      ffmpegPath: '/usr/local/bin/ffmpeg',
    });

    expect(buffer.toString()).toBe('clip-bytes');
    expect(spawnMock).toHaveBeenCalledWith(
      '/usr/local/bin/ffmpeg',
      expect.arrayContaining(['-ss', '10', '-t', '30', '/tmp/source.mp4']),
      expect.any(Object),
    );
    expect(mkdir).toHaveBeenCalled();
    expect(readFile).toHaveBeenCalled();
    expect(rm).toHaveBeenCalled();
  });

  it('reports signal kills with a helpful message', async () => {
    const spawnMock = spawn as jest.MockedFunction<typeof spawn>;
    spawnMock.mockImplementation(() => {
      return {
        stderr: { on: jest.fn() },
        on: (event: string, handler: (code?: number | null, signal?: NodeJS.Signals | null) => void) => {
          if (event === 'close') {
            queueMicrotask(() => handler(null, 'SIGKILL'));
          }
        },
      } as unknown as ReturnType<typeof spawn>;
    });

    await expect(
      trimVideoToBuffer({
        inputPath: '/tmp/source.mp4',
        startSec: 0,
        endSec: 10,
        ffmpegPath: '/usr/bin/ffmpeg',
      }),
    ).rejects.toThrow(/killed by signal SIGKILL/i);
  });

  it('maps ENOENT spawn errors to a clear ffmpeg-not-found message', async () => {
    const spawnMock = spawn as jest.MockedFunction<typeof spawn>;
    spawnMock.mockImplementation(() => {
      return {
        stderr: { on: jest.fn() },
        on: (event: string, handler: (error?: Error) => void) => {
          if (event === 'error') {
            queueMicrotask(() => {
              const error = new Error('spawn ffmpeg ENOENT') as NodeJS.ErrnoException;
              error.code = 'ENOENT';
              handler(error);
            });
          }
        },
      } as unknown as ReturnType<typeof spawn>;
    });

    await expect(
      trimVideoToBuffer({
        inputUrl: 'https://example.com/source.mp4',
        startSec: 0,
        endSec: 10,
        ffmpegPath: '/missing/ffmpeg',
      }),
    ).rejects.toThrow(/FFmpeg binary not found/i);
  });
});
