import { Injectable, Logger } from '@nestjs/common';
import { AIRuntimeService } from '../../ai-runtime/ai-runtime.service';
import type {
  SystemAgentDefinition,
  SystemAgentMessage,
  SystemAgentModelConfig,
  SystemAgentRunContext,
  SystemAgentRunResult,
} from './system-agent.types';

const DEFAULT_TEMPERATURE = 0.4;
const DEFAULT_MAX_OUTPUT_TOKENS = 1024;

/**
 * Executor genérico de agentes de sistema. Recebe uma {@link SystemAgentDefinition},
 * chama o AI runtime com structured output e valida a resposta contra o schema Zod
 * do agente — devolvendo sempre um {@link SystemAgentRunResult} com estado explícito.
 *
 * Nunca lança: falhas viram `status: 'failed'`, pois agentes de sistema rodam em
 * caminhos secundários (título, sugestões) que não podem derrubar o fluxo principal.
 */
@Injectable()
export class SystemAgentRunnerService {
  private readonly logger = new Logger(SystemAgentRunnerService.name);

  constructor(private readonly aiRuntime: AIRuntimeService) {}

  async run<TInput, TOutput>(
    definition: SystemAgentDefinition<TInput, TOutput>,
    input: TInput,
    context: SystemAgentRunContext = {},
  ): Promise<SystemAgentRunResult<TOutput>> {
    const startedAt = new Date().toISOString();

    // Provider/modelo totalmente configurável: o override (vindo do admin)
    // sobrepõe campo a campo o padrão declarado na definição do agente.
    const model = this.resolveModel(definition.model, context.modelOverride);

    try {
      const result = await this.aiRuntime.generateText({
        organizationId: context.organizationId,
        providerId: model.providerId,
        modelId: model.modelId,
        messages: this.withStructuredOutputInstruction(
          definition.buildMessages(input, context),
          definition.outputSchema,
        ),
        temperature: model.temperature ?? DEFAULT_TEMPERATURE,
        maxOutputTokens: model.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
        structuredOutputSchema: definition.outputSchema,
        // System agents run on secondary paths (titles, suggestions) and must
        // keep working without paid credits. Don't require native structured
        // output and prefer zero-cost models — capable models still get the
        // schema natively, text-only models fall back to prompt-instructed JSON
        // parsed by parseOutput below.
        requireStructuredOutput: false,
        preferLowCost: true,
      });

      const data = this.parseOutput(definition, result.text, result.structuredOutput);
      if (data === null) {
        this.logger.warn(`System agent "${definition.key}" produced no valid structured output`);
        return this.fail(definition.key, startedAt, 'Saída estruturada inválida');
      }

      return {
        agentKey: definition.key,
        status: 'completed',
        data,
        errorMessage: null,
        startedAt,
        finishedAt: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida';
      this.logger.warn(`System agent "${definition.key}" failed: ${message}`);
      return this.fail(definition.key, startedAt, message);
    }
  }

  /** Mescla o modelo padrão da definição com o override do admin (campo a campo). */
  private resolveModel(
    base: SystemAgentModelConfig | undefined,
    override: SystemAgentModelConfig | undefined,
  ): SystemAgentModelConfig {
    return {
      providerId: override?.providerId ?? base?.providerId,
      modelId: override?.modelId ?? base?.modelId,
      temperature: override?.temperature ?? base?.temperature,
      maxOutputTokens: override?.maxOutputTokens ?? base?.maxOutputTokens,
    };
  }

  private fail<TOutput>(
    agentKey: string,
    startedAt: string,
    errorMessage: string,
  ): SystemAgentRunResult<TOutput> {
    return {
      agentKey,
      status: 'failed',
      data: null,
      errorMessage,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
  }

  /**
   * Acrescenta uma instrução de JSON estrito ao final das mensagens. Modelos
   * text-only (selecionados quando não há modelo com structured output nativo
   * disponível) passam a devolver um payload que {@link parseOutput} consegue
   * validar contra o schema do agente. Para modelos com structured output
   * nativo a instrução é inofensiva — apenas reforça o formato.
   */
  private withStructuredOutputInstruction(
    messages: SystemAgentMessage[],
    schema: Record<string, unknown>,
  ): SystemAgentMessage[] {
    const instruction: SystemAgentMessage = {
      role: 'system',
      content: [
        'Responda estritamente com um único objeto JSON válido, sem markdown, sem comentários e sem nenhum texto antes ou depois.',
        `O JSON deve seguir exatamente este schema:\n${JSON.stringify(schema)}`,
      ].join('\n'),
    };
    return [...messages, instruction];
  }

  /** Valida a saída do modelo contra o schema do agente, tolerando JSON em texto. */
  private parseOutput<TInput, TOutput>(
    definition: SystemAgentDefinition<TInput, TOutput>,
    text: string | undefined,
    structuredOutput: unknown,
  ): TOutput | null {
    const candidates: unknown[] = [];

    if (structuredOutput && typeof structuredOutput === 'object') {
      candidates.push(structuredOutput);
    }

    const trimmed = text?.trim();
    if (trimmed) {
      try {
        candidates.push(JSON.parse(trimmed));
      } catch {
        const match = trimmed.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            candidates.push(JSON.parse(match[0]));
          } catch {
            // ignore malformed JSON fragment
          }
        }
      }
    }

    for (const candidate of candidates) {
      const parsed = definition.resultSchema.safeParse(candidate);
      if (parsed.success) {
        return parsed.data;
      }
    }

    return null;
  }
}
