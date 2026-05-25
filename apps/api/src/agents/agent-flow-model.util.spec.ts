import { resolveConfiguredTextModel } from './agent-flow-model.util';

describe('resolveConfiguredTextModel', () => {
  it('reads provider and model from the first llm_call node', () => {
    const result = resolveConfiguredTextModel({
      nodes: [
        { id: 'form_1', type: 'form', config: {} },
        {
          id: 'llm_1',
          type: 'llm_call',
          config: {
            providerId: 'provider-1',
            modelId: 'model-1',
            prompt: 'Escreva',
          },
        },
      ],
    });

    expect(result).toEqual({
      providerId: 'provider-1',
      modelId: 'model-1',
    });
  });
});
