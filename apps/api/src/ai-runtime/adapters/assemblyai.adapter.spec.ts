import { AssemblyAIAdapter } from './assemblyai.adapter';

describe('AssemblyAIAdapter', () => {
  const adapter = new AssemblyAIAdapter();

  it('does not advertise generic runtime capabilities', () => {
    expect(adapter.supports('text_generation')).toBe(false);
    expect(adapter.supports('image_generation')).toBe(false);
    expect(adapter.supports('embeddings')).toBe(false);
    expect(adapter.supports('structured_output')).toBe(false);
  });

  it('lists speech-to-text and streaming models', async () => {
    const result = await adapter.listModels({
      id: 'env:assemblyai',
      value: 'assemblyai-key',
      scope: 'platform',
    });

    expect(result.map((item) => item.externalModelId)).toEqual(
      expect.arrayContaining(['universal-3-pro', 'universal-2', 'u3-rt-pro']),
    );
  });
});
