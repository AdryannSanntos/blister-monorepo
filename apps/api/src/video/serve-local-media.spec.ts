import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { serveLocalMediaDirectory } from './serve-local-media';

describe('serveLocalMediaDirectory', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'serve-local-media-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('serves a file over http:// so Remotion can download it', async () => {
    const payload = Buffer.from('fake-mp4-bytes');
    await writeFile(path.join(tmpDir, 'input.mp4'), payload);

    const server = await serveLocalMediaDirectory(tmpDir);

    try {
      const url = server.fileUrl('input.mp4');
      expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/input\.mp4$/);

      const response = await fetch(url);
      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toBe('video/mp4');
      expect(Buffer.from(await response.arrayBuffer())).toEqual(payload);
    } finally {
      await server.close();
    }
  });

  it('does not serve files outside the served directory', async () => {
    const server = await serveLocalMediaDirectory(tmpDir);

    try {
      const response = await fetch(`${server.baseUrl}/..%2F..%2Fetc%2Fpasswd`);
      expect([403, 404]).toContain(response.status);
    } finally {
      await server.close();
    }
  });
});
