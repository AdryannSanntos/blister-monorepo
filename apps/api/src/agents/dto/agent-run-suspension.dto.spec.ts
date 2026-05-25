import {
  createRunSuspensionResponseSchema,
  runSuspensionResolvedPayloadSchema,
} from './agent-run-suspension.dto';

describe('agent run suspension DTOs', () => {
  it('accepts form suspension payload with generated options', () => {
    const parsed = runSuspensionResolvedPayloadSchema.parse({
      title: 'Coletar contexto',
      fields: [
        {
          id: 'audience',
          label: 'Publico',
          type: 'single_select',
          required: true,
          options: ['Gestores', 'Fundadores'],
          allowOther: true,
        },
      ],
    });

    expect(parsed.fields?.[0]?.options).toContain('Gestores');
  });

  it('accepts a response answer round', () => {
    const parsed = createRunSuspensionResponseSchema.parse({
      suspensionId: 'susp_1',
      answers: {
        audience: 'Gestores',
        channel: 'Email',
      },
    });

    expect(parsed.answers.audience).toBe('Gestores');
  });
});
