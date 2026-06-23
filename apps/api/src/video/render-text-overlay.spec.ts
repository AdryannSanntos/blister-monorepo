import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

jest.mock('@remotion/bundler', () => ({
  bundle: jest.fn().mockResolvedValue('http://bundle.test'),
}));

jest.mock('@remotion/renderer', () => ({
  selectComposition: jest.fn().mockResolvedValue({ id: 'neon-wave', durationInFrames: 90 }),
  renderMedia: jest.fn().mockResolvedValue(undefined),
}));

describe('renderTextOverlay', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'render-text-overlay-'));
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('passes an http:// videoSrc to Remotion instead of file://', async () => {
    const videoPath = path.join(tmpDir, 'input.mp4');
    const outputPath = path.join(tmpDir, 'output.mp4');
    await writeFile(videoPath, Buffer.from('clip'));

    const { renderTextOverlay } = await import('./render-text-overlay');
    const { selectComposition, renderMedia } = jest.requireMock('@remotion/renderer');

    await renderTextOverlay({
      videoPath,
      outputPath,
      durationSec: 3,
      width: 1080,
      height: 1920,
      addTitle: true,
      titleText: 'Hook',
      titleStyleSpec: {
        animation: 'neon-wave',
        fontFamily: 'Impact',
        fontSize: 72,
        color: '#FFFFFF',
      },
      titlePosition: { x: 0.5, y: 0.08 },
      titleDurationSec: 3,
      addCaptions: false,
      captionStyleSpec: null,
      captionPosition: { x: 0.5, y: 0.85 },
      captions: [],
    });

    const selectArgs = selectComposition.mock.calls[0][0];
    const renderArgs = renderMedia.mock.calls[0][0];

    expect(selectArgs.inputProps.videoSrc).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/input\.mp4$/);
    expect(renderArgs.inputProps.videoSrc).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/input\.mp4$/);
    expect(selectArgs.inputProps.videoSrc).not.toContain('file://');
    expect(renderArgs.inputProps.videoSrc).not.toContain('file://');
  });
});
