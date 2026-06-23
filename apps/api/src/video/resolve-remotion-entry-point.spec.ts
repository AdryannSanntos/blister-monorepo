import { resolveRemotionEntryPoint } from './resolve-remotion-entry-point';

describe('resolveRemotionEntryPoint', () => {
  it('resolves the Remotion composition entry from the api package root', async () => {
    const entry = await resolveRemotionEntryPoint();

    expect(entry.replace(/\\/g, '/')).toMatch(/src\/video\/compositions\/index\.ts$/);
  });
});
