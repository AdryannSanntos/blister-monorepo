import { uiOutputEnvelopeSchema } from './ui-output.dto';

describe('uiOutputEnvelopeSchema', () => {
  it('accepts a final UI output with markdown and CTA blocks', () => {
    const parsed = uiOutputEnvelopeSchema.parse({
      blocks: [
        { type: 'markdown', value: '# Resultado' },
        { type: 'cta', label: 'Baixar', action: { type: 'download', target: '/file' } },
      ],
    });

    expect(parsed.blocks).toHaveLength(2);
  });

  it('rejects unknown UI output block types', () => {
    const parsed = uiOutputEnvelopeSchema.safeParse({
      blocks: [{ type: 'table', rows: [] }],
    });

    expect(parsed.success).toBe(false);
  });
});
