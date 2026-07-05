import { Inject, Injectable } from '@nestjs/common';
import { parseLlmJson, zodToJsonSchema } from '@company-os/agent-ia-sdk/agents';
import { z } from 'zod';
import { AGENT_IA_SDK, type AgentIaSdkRef } from '../../integrations/agent-ia-sdk/agent-ia-sdk.token';

const aiEditRequestSchema = z.object({
  slideId: z.string(),
  mode: z.enum(['rewrite_text', 'visual_edit']),
  prompt: z.string().min(1),
  layerId: z.string().optional(),
});
export type CarouselAiEditRequest = z.infer<typeof aiEditRequestSchema>;

const aiEditResultSchema = z.object({
  htmlContent: z.string(),
  cssContent: z.string(),
});
export type CarouselAiEditResult = z.infer<typeof aiEditResultSchema>;

@Injectable()
export class CarouselAiEditService {
  constructor(@Inject(AGENT_IA_SDK) private readonly sdk: AgentIaSdkRef) {}

  async applyEdit(params: {
    request: CarouselAiEditRequest;
    htmlContent: string;
    cssContent: string;
  }): Promise<CarouselAiEditResult> {
    const { request, htmlContent, cssContent } = params;

    const provider = await this.sdk.ia.text({
      agentId: 'carousel',
      stepKey: 'ai_edit',
      requiredCapabilities: ['text', 'structured_output'],
    });

    const system =
      'Você edita HTML/CSS de um slide de carrossel. Preserve todos os placeholders {{...}} ' +
      'e atributos data-carousel-layer-id. Responda só com JSON { htmlContent, cssContent }.';

    const response = await provider.complete({
      model: provider.model,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `Ajuste pedido: "${request.prompt}"\n\nHTML atual:\n${htmlContent}\n\nCSS atual:\n${cssContent}`,
        },
      ],
      structuredOutputSchema: zodToJsonSchema(aiEditResultSchema),
      temperature: 0.3,
    });

    if (response.structuredOutput) {
      return aiEditResultSchema.parse(response.structuredOutput);
    }

    const parsed = parseLlmJson(response.content, aiEditResultSchema);
    if (!parsed.success) {
      throw new Error(parsed.error ?? 'Failed to parse AI edit response');
    }

    return parsed.data;
  }
}
