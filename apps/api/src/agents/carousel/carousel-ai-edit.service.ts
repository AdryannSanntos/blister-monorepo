import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseLlmJson, zodToJsonSchema } from '@company-os/agent-ia-sdk/agents';
import { z } from 'zod';
import { AGENT_IA_SDK, type AgentIaSdkRef } from '../../integrations/agent-ia-sdk/agent-ia-sdk.token';
import { CarouselTemplateService } from './services/carousel-template.service';

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

const SYSTEM_PROMPT = [
  'Você é um especialista em edição de slides de carrossel em HTML/CSS.',
  '',
  'Fluxo obrigatório a cada edição:',
  '1. Leia o PEDIDO do usuário e entenda exatamente o que ele quer alterar.',
  '2. Analise o HTML e o CSS ATUAIS do slide.',
  '3. Aplique EXATAMENTE o que o pedido descreve — nada além, nada a menos.',
  '4. Mantenha SEMPRE a identidade visual do TEMPLATE de referência: tipografia,',
  '   pesos de fonte, paleta, espaçamento, estrutura e convenções mostradas nas',
  '   instruções e nos exemplos de slides do template.',
  '',
  'Regras invioláveis:',
  '- Preserve todos os placeholders no formato {{...}} exatamente como estão.',
  '- Preserve todos os atributos data-carousel-layer-id existentes. Ao criar',
  '  elementos novos, gere data-carousel-layer-id únicos seguindo o mesmo padrão.',
  '- Você PODE adicionar elementos que não existem nos exemplos (inclusive para',
  '  gerar conteúdo novo), mas eles DEVEM seguir a mesma linha do template:',
  '  mesma paleta, fontes, pesos, espaçamento e estilo dos exemplos.',
  '- Nunca fuja da estética do template nem invente conteúdo fora do que o pedido pede.',
  '- Responda somente com JSON { htmlContent, cssContent }.',
].join('\n');

@Injectable()
export class CarouselAiEditService {
  private readonly logger = new Logger(CarouselAiEditService.name);

  constructor(
    @Inject(AGENT_IA_SDK) private readonly sdk: AgentIaSdkRef,
    private readonly templateService: CarouselTemplateService,
  ) {}

  async applyEdit(params: {
    request: CarouselAiEditRequest;
    templateId: string;
    slideType: string;
    htmlContent: string;
    cssContent: string;
  }): Promise<CarouselAiEditResult> {
    const { request, templateId, slideType, htmlContent, cssContent } = params;

    const provider = await this.sdk.ia.text({
      agentId: 'carousel',
      stepKey: 'ai_edit',
      requiredCapabilities: ['text', 'structured_output'],
    });

    const templateReference = this.buildTemplateReference(templateId, slideType);

    const userContent = [
      '=== PEDIDO DO USUÁRIO ===',
      `"${request.prompt}"`,
      '',
      `=== TEMPLATE DE REFERÊNCIA (${templateId}) — siga esta linha visual SEMPRE ===`,
      templateReference,
      '',
      '=== HTML ATUAL DO SLIDE ===',
      htmlContent,
      '',
      '=== CSS ATUAL DO SLIDE ===',
      cssContent,
    ].join('\n');

    const response = await provider.complete({
      model: provider.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
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

  /**
   * Builds the reference block the model must follow: the template's authoring
   * instructions plus the example slide(s) of the same type. This is what keeps
   * every AI edit anchored to the chosen template's visual line. Failures to
   * load a template (unknown id, missing files) degrade gracefully to an empty
   * reference rather than blocking the edit.
   */
  private buildTemplateReference(templateId: string, slideType: string): string {
    const sections: string[] = [];

    try {
      const instructions = this.templateService.getInstructions(templateId).trim();
      if (instructions) {
        sections.push(`Instruções do template:\n${instructions}`);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to load instructions for template "${templateId}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    try {
      const variationIds = this.templateService.getAvailableVariations(templateId, slideType);
      const examples: string[] = [];
      for (const variationId of variationIds) {
        try {
          const variation = this.templateService.getSlideVariation(
            templateId,
            slideType,
            variationId,
          );
          examples.push(
            [
              `--- variação ${variationId} (HTML) ---`,
              variation.html,
              `--- variação ${variationId} (CSS) ---`,
              variation.css,
            ].join('\n'),
          );
        } catch {
          // Skip a single unreadable variation without failing the whole reference.
        }
      }
      if (examples.length) {
        sections.push(
          `Exemplos de slides do tipo "${slideType}" — use como referência de estilo:\n${examples.join(
            '\n\n',
          )}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to load variations for template "${templateId}" (${slideType}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return sections.length
      ? sections.join('\n\n')
      : '(Referência do template indisponível — mantenha o estilo do HTML/CSS atual.)';
  }
}
