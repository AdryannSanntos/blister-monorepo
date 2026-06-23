import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const MIME_BY_EXT: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export type LocalMediaServer = {
  baseUrl: string;
  fileUrl: (fileName: string) => string;
  close: () => Promise<void>;
};

/**
 * Serve files from a single directory over HTTP. Remotion's OffthreadVideo
 * downloads assets via http/https only — local paths must be exposed this way.
 */
export const serveLocalMediaDirectory = async (
  directory: string,
): Promise<LocalMediaServer> => {
  const resolvedDir = path.resolve(directory);

  const server = http.createServer(async (req, res) => {
    const requested = path.basename(req.url?.split('?')[0] ?? '');
    if (!requested) {
      res.writeHead(404);
      res.end();
      return;
    }

    const filePath = path.resolve(resolvedDir, requested);
    if (!filePath.startsWith(`${resolvedDir}${path.sep}`) && filePath !== resolvedDir) {
      res.writeHead(403);
      res.end();
      return;
    }

    try {
      const info = await stat(filePath);
      if (!info.isFile()) {
        res.writeHead(404);
        res.end();
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_BY_EXT[ext] ?? 'application/octet-stream',
        'Content-Length': info.size,
        'Access-Control-Allow-Origin': '*',
      });
      createReadStream(filePath).pipe(res);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    fileUrl: (fileName) => `${baseUrl}/${encodeURIComponent(fileName)}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
};
