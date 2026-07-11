import { z } from 'zod';
import { zodToJsonSchema } from '@company-os/agent-ia-sdk/agents';
import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import { carouselNarrativeRoleSchema, carouselSlideTypeSchema } from '@company-os/types';
import { CarouselTemplateService } from '../services/carousel-template.service';
import { resetCarouselRunDeps, setCarouselRunDeps } from '../ports/carousel-run-deps';
import { createGenerateContentStep } from './generate-content.step';

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

describe('createGenerateContentStep', () => {
  beforeEach(() => {
    resetCarouselRunDeps();
    setCarouselRunDeps({
      templateService: new CarouselTemplateService(),
      renderSlideToPng: async () => Buffer.from('png'),
      resolveFileUrl: async () => 'https://example.com/image.png',
      storeRenderedPng: async () => 'file_mock_png',
      listOwnedTemplateIds: async () => ['content-machine'],
    });
  });

  afterEach(() => {
    resetCarouselRunDeps();
  });

  const context = {
    agentId: 'carousel',
    stepKey: 'generate_content',
    inputPayload: {
      theme: 'Produtividade',
      slidesCount: 5,
      templateId: 'content-machine',
      selectedIdeaId: 'idea_1',
    },
    previousStepsOutput: {
      await_idea_selection: {
        selectedIdeaId: 'idea_1',
        ideas: [
          {
            id: 'idea_1',
            title: '5 hábitos',
            description: 'Rotina matinal para creators',
          },
        ],
      },
    },
  } as unknown as StepExecutionContext;

  it('pads under-delivered slide lists instead of failing the run', async () => {
    const step = createGenerateContentStep();
    const underDelivered = {
      slides: [
        {
          id: 'slide_1',
          order: 1,
          type: 'start' as const,
          narrativeRole: 'hook' as const,
          title: 'Capa',
          imageBrief: 'Creator no escritório',
        },
      ],
    };

    const result = await step(context, {
      imageProvider: null,
      llmProvider: {
        complete: async () => ({
          content: JSON.stringify(underDelivered),
          model: 'stub/model',
          tokensInput: 10,
          tokensOutput: 5,
          costUsd: 0.001,
        }),
      },
    });

    expect(result.type).toBe('CONTINUE');
    expect(result.output?.slides).toHaveLength(5);
    expect((result.output?.slides as Array<{ id: string }>)[0]?.id).toBe('slide_1');
    expect((result.output?.slides as Array<{ narrativeRole?: string }>)[4]?.narrativeRole).toBe(
      'cta',
    );
  });

  it('sanitizes hashtag spam on hook slide after under-delivery fallback', async () => {
    const step = createGenerateContentStep();
    const hashtagWall = Array.from({ length: 30 }, (_, index) => `#Tag${index}`).join(' ');
    const underDelivered = {
      slides: [
        {
          id: 'slide_1',
          order: 1,
          type: 'start' as const,
          title: `Loop Engineering: pare de escrever prompts. ${hashtagWall}`,
          body: 'Legenda inteira que não deveria estar na capa.',
          imageBrief: 'Creator no escritório',
        },
      ],
    };

    const result = await step(context, {
      imageProvider: null,
      llmProvider: {
        complete: async () => ({
          content: JSON.stringify(underDelivered),
          model: 'stub/model',
          tokensInput: 10,
          tokensOutput: 5,
          costUsd: 0.001,
        }),
      },
    });

    const slides = result.output?.slides as Array<{
      title?: string;
      body?: string;
      subtitle?: string;
    }>;

    expect(result.type).toBe('CONTINUE');
    expect(slides).toHaveLength(5);
    expect(slides[0]?.title).toContain('Loop Engineering');
    expect(slides[0]?.title).not.toContain('#');
    expect(slides[0]?.body).toBeUndefined();
    expect(slides[0]?.subtitle).toBeUndefined();
    expect(slides[1]?.body).toContain('Rotina matinal');
  });

  it('sanitizes hashtag spam on hook slide on the happy path', async () => {
    const step = createGenerateContentStep();
    const hashtagWall = Array.from({ length: 20 }, (_, index) => `#Tag${index}`).join(' ');
    const fullResponse = {
      slides: [
        {
          id: 'slide_1',
          order: 1,
          type: 'start' as const,
          narrativeRole: 'hook' as const,
          title: `Loop Engineering: pare de ==escrever== prompts. ${hashtagWall}`,
          body: 'Não deve aparecer na capa.',
          imageBrief: 'Creator no escritório',
        },
        {
          id: 'slide_2',
          order: 2,
          type: 'text' as const,
          narrativeRole: 'scene' as const,
          body: 'Primeiro ponto com contexto real.',
          body2: 'Desenvolvimento do argumento.',
          subtitle: 'Linha de apoio.',
        },
        {
          id: 'slide_3',
          order: 3,
          type: 'text_image' as const,
          narrativeRole: 'scene' as const,
          body: 'Segundo ponto visual.',
          body2: 'Mais contexto.',
          subtitle: 'Fecho do raciocínio.',
          imageBrief: 'Pessoa trabalhando no laptop.',
        },
        {
          id: 'slide_4',
          order: 4,
          type: 'text' as const,
          narrativeRole: 'scene' as const,
          body: 'Terceiro ponto prático.',
          body2: 'Exemplo concreto.',
          subtitle: 'Por que importa.',
        },
        {
          id: 'slide_5',
          order: 5,
          type: 'text' as const,
          narrativeRole: 'cta' as const,
          body: 'Fechamento editorial.',
          body2: 'Convite à ação.',
          subtitle: 'Compartilhe.',
          callToAction: 'Qual passo você vai dar hoje?',
        },
      ],
    };

    const result = await step(context, {
      imageProvider: null,
      llmProvider: {
        complete: async () => ({
          content: JSON.stringify(fullResponse),
          model: 'stub/model',
          tokensInput: 10,
          tokensOutput: 5,
          costUsd: 0.001,
        }),
      },
    });

    const slides = result.output?.slides as Array<{
      title?: string;
      body?: string;
      subtitle?: string;
    }>;

    expect(result.type).toBe('CONTINUE');
    expect(slides).toHaveLength(5);
    expect(slides[0]?.title).toContain('Loop Engineering');
    expect(slides[0]?.title).not.toContain('#');
    expect(slides[0]?.body).toBeUndefined();
    expect(slides[2]?.body).toContain('Segundo ponto visual');
  });
});
