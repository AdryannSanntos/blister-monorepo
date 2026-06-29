import { z } from 'zod';
import { zodToJsonSchema } from '@company-os/agent-ia-sdk/agents';
import { carouselNarrativeRoleSchema, carouselSlideTypeSchema } from '@company-os/types';

describe('generate-content schema', () => {
  it('converts content LLM output schema to JSON schema without throwing', () => {
    const contentSlideLaxSchema = z.object({
      id: z.string(),
      order: z.number(),
      type: carouselSlideTypeSchema,
      narrativeRole: carouselNarrativeRoleSchema.optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      body: z.string().optional(),
      body2: z.string().optional(),
      callToAction: z.string().optional(),
      ctaKeyword: z.string().optional(),
      ctaHint: z.string().optional(),
      imageBrief: z.string().optional(),
      listItems: z.array(z.string()).optional(),
    });

    const schema = z.object({ slides: z.array(contentSlideLaxSchema) });
    const json = zodToJsonSchema(schema);

    expect(json.type).toBe('object');
    const serialized = JSON.stringify(json);
    expect(serialized).not.toContain('"null"');
    expect(serialized).not.toContain('anyOf');
    expect(serialized).toContain('body2');
    const slideProps = (
      (json.properties as Record<string, unknown>)?.slides as {
        items?: { properties?: Record<string, unknown> };
      }
    )?.items?.properties;

    expect(slideProps).toMatchObject({
      body: expect.anything(),
      body2: expect.anything(),
    });
  });
});
