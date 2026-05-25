import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AIRuntimeService } from '../ai-runtime/ai-runtime.service';
import { PrismaService } from '../prisma/prisma.service';
import { RagContextAssemblyService } from '../rag/rag-context-assembly.service';
import { AgentContextService } from './agent-context.service';
import { resolveConfiguredTextModel } from './agent-flow-model.util';
import {
  agentChatTurnDecisionSchema,
  type OrchestrateMessageInput,
  type OrchestrationEvent,
  type OrchestrationResult,
} from './dto/agent-chat-orchestration.dto';

/** strict JSON schema exige todas as keys em `required`. */
const TURN_DECISION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    createRun: {
      type: 'boolean',
      description:
        'true apenas quando a mensagem exige executar o workflow configurado do agente para produzir uma entrega operacional',
    },
    assistantMessage: {
      type: 'string',
      description: 'Resposta em português que o agente envia ao usuário neste turno',
    },
    executionReason: {
      type: 'string',
      description: 'Motivo curto da execução; use string vazia quando createRun for false',
    },
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['intent_classified', 'context_loaded', 'context_read', 'execution_decided'],
          },
          label: { type: 'string' },
        },
        required: ['type', 'label'],
        additionalProperties: false,
      },
    },
  },
  required: ['createRun', 'assistantMessage', 'executionReason', 'events'],
  additionalProperties: false,
} as const;

const CHAT_CONTINGENCY_MESSAGE =
  'Estou com uma instabilidade para responder agora. Tente enviar a mensagem de novo em alguns segundos.';

const MAX_HISTORY_MESSAGES = 24;

@Injectable()
export class AgentChatOrchestratorService {
  private readonly logger = new Logger(AgentChatOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiRuntimeService: AIRuntimeService,
    private readonly agentContextService: AgentContextService,
    private readonly ragContextAssemblyService: RagContextAssemblyService,
  ) {}

  async orchestrateMessage(input: OrchestrateMessageInput): Promise<OrchestrationResult> {
    const agent = await this.prisma.companyAgent.findFirst({
      where: { id: input.agentId, organizationId: input.organizationId },
      select: {
        id: true,
        name: true,
        activeVersionId: true,
      },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const activeVersion = agent.activeVersionId
      ? await this.prisma.agentVersion.findFirst({
          where: { id: agent.activeVersionId, agentId: agent.id },
          select: { flowDefinition: true },
        })
      : null;

    const flowConfig = this.readFlowConfig(activeVersion?.flowDefinition);
    const agentContext = await this.agentContextService.resolveForRun(
      input.organizationId,
      input.agentId,
    );

    const ragPack = await this.ragContextAssemblyService
      .assemble(input.organizationId, input.message, { limit: 6 })
      .catch(() => ({ query: input.message, chunks: [], totalFound: 0, metadata: {} }));

    const contextPrompt = this.ragContextAssemblyService.formatForPrompt(ragPack);
    const resolvedContextHints = ragPack.chunks.map(
      (chunk) => chunk.title ?? chunk.sourceType ?? 'contexto',
    );

    const rawHistory = input.threadId
      ? await this.loadThreadHistory(input.threadId, input.organizationId)
      : [];
    const history = this.trimDuplicateLatestUserMessage(rawHistory, input.message.trim());

    const canExecuteWorkflow = Boolean(agent.activeVersionId);
    const configuredTextModel = resolveConfiguredTextModel(activeVersion?.flowDefinition);
    const decision = await this.decideTurnWithAgent({
      organizationId: input.organizationId,
      configuredTextModel,
      agentName: agent.name,
      userMessage: input.message.trim(),
      flowConfig,
      agentInstructions:
        typeof agentContext.agentProfile.instructions === 'string'
          ? agentContext.agentProfile.instructions
          : null,
      agentNotes:
        typeof agentContext.agentProfile.notes === 'string' ? agentContext.agentProfile.notes : null,
      contextPrompt,
      history,
      canExecuteWorkflow,
      workflowObjective: flowConfig.objective,
    });

    const events: OrchestrationEvent[] = [
      ...(contextPrompt
        ? [{ type: 'context_read' as const, label: 'Contexto da empresa consultado' }]
        : []),
      ...decision.events.map((event) => ({
        type: event.type,
        label: event.label,
      })),
    ];

    if (decision.createRun && canExecuteWorkflow) {
      events.push({
        type: 'execution_decided',
        label: decision.executionReason?.trim() || 'Execução do workflow necessária',
      });
    }

    const createRun = decision.createRun && canExecuteWorkflow;
    const mode = createRun
      ? 'execution'
      : contextPrompt.length > 0
        ? 'context_retrieval'
        : 'conversation';

    return {
      mode,
      createRun,
      assistantMessage: decision.assistantMessage.trim(),
      events,
      resolvedContextHints,
      executionReason: createRun ? decision.executionReason?.trim() : undefined,
    };
  }

  private async decideTurnWithAgent(params: {
    organizationId: string;
    configuredTextModel: { providerId?: string; modelId?: string };
    agentName: string;
    userMessage: string;
    flowConfig: {
      name: string;
      objective: string;
      instructions: string;
      fallbackMessage: string;
    };
    agentInstructions: string | null;
    agentNotes: string | null;
    contextPrompt: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    canExecuteWorkflow: boolean;
    workflowObjective: string;
  }) {
    const messages = [
      { role: 'system' as const, content: this.buildSystemPrompt(params) },
      ...params.history.map((entry) => ({
        role: entry.role,
        content: entry.content,
      })),
      { role: 'user' as const, content: params.userMessage },
    ];

    const structured = await this.tryStructuredTurn(
      params.organizationId,
      params.configuredTextModel,
      messages,
    );
    if (structured) {
      return structured;
    }

    const jsonTurn = await this.tryJsonTurn(
      params.organizationId,
      params.configuredTextModel,
      messages,
    );
    if (jsonTurn) {
      return jsonTurn;
    }

    const conversational = await this.tryConversationalTurn(
      params.organizationId,
      params.configuredTextModel,
      params,
      messages,
    );
    if (conversational) {
      return conversational;
    }

    return {
      createRun: false,
      assistantMessage: CHAT_CONTINGENCY_MESSAGE,
      events: [{ type: 'intent_classified' as const, label: 'Resposta de contingência' }],
      executionReason: undefined,
    };
  }

  private async tryStructuredTurn(
    organizationId: string,
    configuredTextModel: { providerId?: string; modelId?: string },
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  ) {
    try {
      const result = await this.aiRuntimeService.generateText({
        organizationId,
        providerId: configuredTextModel.providerId,
        modelId: configuredTextModel.modelId,
        messages,
        temperature: 0.35,
        maxOutputTokens: 2048,
        structuredOutputSchema: TURN_DECISION_JSON_SCHEMA as unknown as Record<string, unknown>,
      });

      return this.parseTurnDecision(result.text, result.structuredOutput);
    } catch (error) {
      this.logger.warn(
        `Structured agent chat turn failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  private async tryJsonTurn(
    organizationId: string,
    configuredTextModel: { providerId?: string; modelId?: string },
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  ) {
    const jsonHint =
      'Responda APENAS com um JSON válido contendo: createRun (boolean), assistantMessage (string), executionReason (string, vazio se createRun for false), events (array com type e label).';

    try {
      const result = await this.aiRuntimeService.generateText({
        organizationId,
        providerId: configuredTextModel.providerId,
        modelId: configuredTextModel.modelId,
        messages: messages.map((message, index) =>
          index === 0 ? { ...message, content: `${message.content}\n\n${jsonHint}` } : message,
        ),
        temperature: 0.35,
        maxOutputTokens: 2048,
      });

      return this.parseTurnDecision(result.text, undefined);
    } catch (error) {
      this.logger.warn(
        `JSON agent chat turn failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  private async tryConversationalTurn(
    organizationId: string,
    configuredTextModel: { providerId?: string; modelId?: string },
    params: {
      agentName: string;
      userMessage: string;
      agentInstructions: string | null;
      agentNotes: string | null;
      contextPrompt: string;
      canExecuteWorkflow: boolean;
      workflowObjective: string;
      flowConfig: { objective: string; instructions: string };
    },
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  ) {
    const conversationalSystem = [
      `Você é o agente "${params.agentName}" do Workana AI.`,
      'Responda ao usuário em português, de forma natural e útil.',
      'Use as instruções e o contexto abaixo. Não mencione JSON, workflow interno nem limitações técnicas.',
      params.agentInstructions?.trim() ? `Instruções: ${params.agentInstructions.trim()}` : '',
      params.flowConfig.instructions?.trim()
        ? `Instruções do fluxo: ${params.flowConfig.instructions.trim()}`
        : '',
      params.contextPrompt.trim(),
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const result = await this.aiRuntimeService.generateText({
        organizationId,
        providerId: configuredTextModel.providerId,
        modelId: configuredTextModel.modelId,
        messages: [
          { role: 'system', content: conversationalSystem },
          ...messages.filter((message) => message.role !== 'system'),
        ],
        temperature: 0.5,
        maxOutputTokens: 2048,
      });

      const text = result.text?.trim();
      if (!text) {
        return null;
      }

      const shouldRun =
        params.canExecuteWorkflow && this.heuristicWorkflowExecution(params.userMessage);

      return {
        createRun: shouldRun,
        assistantMessage: shouldRun
          ? `${text}\n\nVou executar o workflow para concluir essa entrega.`
          : text,
        executionReason: shouldRun ? 'Execução inferida após falha do classificador estruturado' : undefined,
        events: [{ type: 'intent_classified' as const, label: 'Resposta conversacional' }],
      };
    } catch (error) {
      this.logger.warn(
        `Conversational agent chat turn failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  /** Usado só quando o classificador estruturado falhou e ainda precisamos de execução óbvia. */
  private heuristicWorkflowExecution(message: string) {
    const normalized = message.trim().toLowerCase();
    if (normalized.length < 12) {
      return false;
    }

    const action =
      /\b(ger[ae]|cri[ae]|produz[ae]|elabor[ae]|escrev[ae]|redig[ae]|mont[ae]|faça|fa[zç]|execut[ae]|rod[ae]|envie|publiq)\b/i.test(
        normalized,
      );
    const exploratory =
      /^(como|o que|qual|quais|me expliq|poderia|seria)\b/i.test(normalized) ||
      /\b(como\s+(você|vc)|me\s+expliq)\b/i.test(normalized);

    return action && !exploratory;
  }

  private buildSystemPrompt(params: {
    agentName: string;
    flowConfig: {
      name: string;
      objective: string;
      instructions: string;
      fallbackMessage: string;
    };
    agentInstructions: string | null;
    agentNotes: string | null;
    contextPrompt: string;
    canExecuteWorkflow: boolean;
    workflowObjective: string;
  }) {
    const workflowStatus = params.canExecuteWorkflow
      ? 'O workflow está publicado e pode ser executado quando necessário.'
      : 'O workflow ainda não está ativo; NUNCA defina createRun como true.';

    const sections = [
      `Você é o agente "${params.agentName}" do Workana AI.`,
      'Sua função neste turno é conversar com o usuário e decidir se a mensagem exige executar o workflow operacional do agente.',
      '',
      '## Regras',
      '- SEMPRE preencha assistantMessage com uma resposta natural, útil e em português — nunca uma mensagem genérica de placeholder.',
      '- Use as instruções do agente, do workflow e o contexto recuperado para responder perguntas, orientar e esclarecer.',
      '- Defina createRun como true SOMENTE quando o usuário pedir explicitamente uma entrega que depende do workflow (gerar artefato final, rodar fluxo, produzir documento/campanha/copy completa, executar consultoria estruturada, etc.).',
      '- Defina createRun como false para saudações, dúvidas, brainstorm, pedidos de explicação, revisão de ideias, consulta de referências ou qualquer conversa que você possa resolver respondendo no chat.',
      '- Quando createRun for true, assistantMessage deve avisar brevemente que vai executar o workflow; não descreva passos internos técnicos.',
      '- Quando createRun for false, assistantMessage é a resposta completa ao usuário.',
      '- events: liste 1–3 eventos curtos visíveis ao usuário (ex.: "Intenção analisada", "Contexto aplicado").',
      workflowStatus,
      '',
      '## Instruções do agente',
      params.agentInstructions?.trim() || '(sem instruções específicas)',
    ];

    if (params.agentNotes?.trim()) {
      sections.push('', '## Notas do agente', params.agentNotes.trim());
    }

    sections.push(
      '',
      '## Workflow',
      `Nome: ${params.flowConfig.name || 'Workflow principal'}`,
      `Objetivo: ${params.workflowObjective || params.flowConfig.objective || '(não definido)'}`,
      `Instruções do fluxo: ${params.flowConfig.instructions?.trim() || '(não definidas)'}`,
    );

    if (params.contextPrompt.trim()) {
      sections.push('', params.contextPrompt.trim());
    }

    sections.push(
      '',
      'Responda APENAS com o JSON do schema (createRun, assistantMessage, executionReason opcional, events).',
    );

    return sections.join('\n');
  }

  private parseTurnDecision(
    text: string,
    structuredOutput: unknown,
  ): ReturnType<typeof agentChatTurnDecisionSchema.parse> | null {
    const candidates: unknown[] = [];

    if (structuredOutput && typeof structuredOutput === 'object') {
      candidates.push(structuredOutput);
    }

    const trimmed = text.trim();
    if (trimmed) {
      try {
        candidates.push(JSON.parse(trimmed));
      } catch {
        const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            candidates.push(JSON.parse(jsonMatch[0]));
          } catch {
            // ignore
          }
        }
      }
    }

    for (const candidate of candidates) {
      const normalized = this.normalizeTurnDecisionCandidate(candidate);
      const parsed = agentChatTurnDecisionSchema.safeParse(normalized);
      if (parsed.success) {
        return {
          ...parsed.data,
          executionReason: parsed.data.executionReason?.trim() || undefined,
        };
      }
    }

    if (trimmed.length > 0) {
      return {
        createRun: false,
        assistantMessage: trimmed,
        events: [{ type: 'intent_classified', label: 'Resposta direta do modelo' }],
      };
    }

    return null;
  }

  private normalizeTurnDecisionCandidate(candidate: unknown) {
    if (!candidate || typeof candidate !== 'object') {
      return candidate;
    }

    const record = candidate as Record<string, unknown>;
    const rawEvents = Array.isArray(record.events) ? record.events : [];
    const mappedEvents = rawEvents.map((event) => {
        if (!event || typeof event !== 'object') {
          return { type: 'intent_classified', label: 'Intenção analisada' };
        }
        const row = event as Record<string, unknown>;
        return {
          type:
            typeof row.type === 'string' &&
            [
              'intent_classified',
              'context_loaded',
              'context_read',
              'execution_decided',
            ].includes(row.type)
              ? row.type
              : 'intent_classified',
          label: typeof row.label === 'string' ? row.label : 'Intenção analisada',
        };
    });

    return {
      createRun: Boolean(record.createRun),
      assistantMessage:
        typeof record.assistantMessage === 'string'
          ? record.assistantMessage
          : typeof record.message === 'string'
            ? record.message
            : '',
      executionReason:
        typeof record.executionReason === 'string' ? record.executionReason : '',
      events:
        mappedEvents.length > 0
          ? mappedEvents
          : [{ type: 'intent_classified', label: 'Intenção analisada' }],
    };
  }

  private async loadThreadHistory(threadId: string, organizationId: string) {
    const thread = await this.prisma.agentChatThread.findFirst({
      where: { id: threadId, organizationId },
      select: { id: true },
    });

    if (!thread) {
      return [];
    }

    const messages = await this.prisma.agentChatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      take: MAX_HISTORY_MESSAGES,
      select: { role: true, content: true },
    });

    return messages
      .reverse()
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      }));
  }

  private trimDuplicateLatestUserMessage(
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    userMessage: string,
  ) {
    const last = history[history.length - 1];
    if (last?.role === 'user' && last.content.trim() === userMessage) {
      return history.slice(0, -1);
    }
    return history;
  }

  private readFlowConfig(flowDefinition: unknown) {
    const config =
      flowDefinition &&
      typeof flowDefinition === 'object' &&
      'config' in flowDefinition &&
      flowDefinition.config &&
      typeof flowDefinition.config === 'object'
        ? (flowDefinition.config as Record<string, unknown>)
        : {};

    return {
      name: typeof config.name === 'string' ? config.name : '',
      objective: typeof config.objective === 'string' ? config.objective : '',
      instructions: typeof config.instructions === 'string' ? config.instructions : '',
      fallbackMessage: typeof config.fallbackMessage === 'string' ? config.fallbackMessage : '',
    };
  }
}
