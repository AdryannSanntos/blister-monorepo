import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AIRuntimeService } from '../ai-runtime/ai-runtime.service';
import { MembershipService } from '../organization/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import { RagContextAssemblyService } from '../rag/rag-context-assembly.service';
import { AgentContextService } from './agent-context.service';
import { resolveConfiguredTextModel } from './agent-flow-model.util';
import { AgentToolRuntimeService } from './agent-tool-runtime.service';
import {
  type AgentChatToolLoopDecision,
  type OrchestrateMessageInput,
  type OrchestrationCitation,
  type OrchestrationEmit,
  type OrchestrationEvent,
  type OrchestrationResult,
  type OrchestrationToolCall,
  type OrchestrationToolPart,
  agentChatToolLoopDecisionSchema,
  agentChatTurnDecisionSchema,
} from './dto/agent-chat-orchestration.dto';
import type { AgentChatToolName, AgentToolResult } from './dto/agent-chat-tool.dto';

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

/** Tool-loop decision schema for structured output. All keys required (strict). */
const TOOL_LOOP_JSON_SCHEMA = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['respond', 'tool_call'],
      description: 'tool_call para pesquisar antes de responder; respond para responder agora',
    },
    assistantMessage: {
      type: 'string',
      description: 'Resposta final em português quando action for respond; vazio em tool_call',
    },
    decisionReason: {
      type: 'string',
      description: 'Motivo curto explicando por que essa e a proxima acao correta neste turno',
    },
    createRun: {
      type: 'boolean',
      description: 'true apenas quando a resposta exige executar o workflow operacional do agente',
    },
    executionReason: {
      type: 'string',
      description: 'Motivo curto da execução; vazio quando createRun for false',
    },
    toolName: {
      type: 'string',
      enum: ['rag_search', 'file_search', 'web_research', 'none'],
      description: 'Ferramenta a chamar quando action for tool_call; none quando respond',
    },
    toolQuery: {
      type: 'string',
      description: 'Consulta para a ferramenta quando action for tool_call; vazio em respond',
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
  required: [
    'action',
    'assistantMessage',
    'decisionReason',
    'createRun',
    'executionReason',
    'toolName',
    'toolQuery',
    'events',
  ],
  additionalProperties: false,
} as const;

const CHAT_CONTINGENCY_MESSAGE =
  'Estou com uma instabilidade para responder agora. Tente enviar a mensagem de novo em alguns segundos.';

/**
 * Reforço de persona: o modelo deve responder COMO o agente, em primeira pessoa.
 * Sem isso, perguntas de identidade ("você é um agente do quê?") fazem o modelo
 * espelhar a frase do system prompt ("Você é o agente ...") em segunda pessoa,
 * como se fosse uma IA descrevendo o agente.
 */
const FIRST_PERSON_PERSONA_RULE =
  'Fale sempre em primeira pessoa, como o próprio agente. Você É o agente — nunca se descreva como "uma IA" nem use segunda/terceira pessoa para falar de si mesmo. Ex.: responda "Sou o agente ...", nunca "Você é o agente ...".';

const MAX_HISTORY_MESSAGES = 24;
/** Hard ceiling on tool calls per turn to prevent runaway loops. */
const MAX_TOOL_ITERATIONS = 4;
const TOOL_RESULT_PREVIEW_COUNT = 6;
/** Per-result snippet budget fed back to the LLM — sized to carry a full chunk. */
const TOOL_RESULT_SNIPPET_CHARS = 2400;
const READ_ONLY_TOOL_NAMES: AgentChatToolName[] = ['rag_search', 'file_search', 'web_research'];
const DEFAULT_INTERNAL_CHAT_TOOLS: AgentChatToolName[] = ['rag_search', 'file_search'];
const NEXT_ACTION_ANALYSIS_TOOL_NAME = 'next_action_analysis';

const TOOL_LABELS: Record<AgentChatToolName, string> = {
  rag_search: 'Consultou contexto da empresa',
  file_search: 'Pesquisou arquivos do contexto',
  web_research: 'Pesquisou fontes externas',
};

type AgentChatTurnDecisionLike = {
  createRun: boolean;
  assistantMessage: string;
  events: Array<{ type: OrchestrationEvent['type']; label: string }>;
  executionReason?: string;
};

type RoutingHint = {
  recommendedAction: 'respond' | AgentChatToolName;
  reason: string;
  query: string;
  /**
   * true quando há sinal forte e determinístico (saudação, identidade, menção
   * explícita a arquivo/web). Apenas hints confiantes forçam um tool_call/respond
   * sem consultar o modelo; o fallback genérico de RAG fica confident=false para
   * deixar o LLM decidir.
   */
  confident: boolean;
};

@Injectable()
export class AgentChatOrchestratorService {
  private readonly logger = new Logger(AgentChatOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiRuntimeService: AIRuntimeService,
    private readonly agentContextService: AgentContextService,
    private readonly ragContextAssemblyService: RagContextAssemblyService,
    private readonly agentToolRuntime: AgentToolRuntimeService,
    private readonly membershipService: MembershipService,
  ) {}

  async orchestrateMessage(input: OrchestrateMessageInput): Promise<OrchestrationResult> {
    const agent = await this.prisma.companyAgent.findFirst({
      where: { id: input.agentId, organizationId: input.organizationId },
      select: {
        id: true,
        name: true,
        activeVersionId: true,
        allowedTools: true,
        status: true,
      },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const allowedTools = this.resolveAllowedTools(agent.allowedTools, agent.status);

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

    const canExecuteWorkflow = false; // workflow runs paused
    const configuredTextModel = resolveConfiguredTextModel(activeVersion?.flowDefinition);

    const agentInstructions =
      typeof agentContext.agentProfile.instructions === 'string'
        ? agentContext.agentProfile.instructions
        : null;
    const agentNotes =
      typeof agentContext.agentProfile.notes === 'string' ? agentContext.agentProfile.notes : null;

    const decisionParams = {
      organizationId: input.organizationId,
      configuredTextModel,
      agentName: agent.name,
      userMessage: input.message.trim(),
      flowConfig,
      agentInstructions,
      agentNotes,
      contextPrompt,
      history,
      canExecuteWorkflow,
      workflowObjective: flowConfig.objective,
    };

    let toolParts: OrchestrationToolPart[] = [];
    let citations: OrchestrationCitation[] = [];
    let toolCalls: OrchestrationToolCall[] = [];
    let decision: AgentChatTurnDecisionLike;

    if (allowedTools.length > 0) {
      const userPermissions = await this.resolveUserPermissions(input.organizationId, input.userId);
      const loop = await this.runToolLoop({
        ...decisionParams,
        agentId: input.agentId,
        userId: input.userId,
        allowedTools,
        userPermissions,
      });
      decision = loop.decision;
      toolParts = loop.toolParts;
      citations = loop.citations;
      toolCalls = loop.toolCalls;
    } else {
      decision = await this.decideTurnWithAgent(decisionParams);
    }

    const events: OrchestrationEvent[] = [
      ...(contextPrompt
        ? [{ type: 'context_read' as const, label: 'Contexto da empresa consultado' }]
        : []),
      ...toolCalls.map((call) => ({
        type: 'context_read' as const,
        label: TOOL_LABELS[call.toolName],
      })),
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
      : contextPrompt.length > 0 || toolCalls.length > 0
        ? 'context_retrieval'
        : 'conversation';

    return {
      mode,
      createRun,
      assistantMessage: decision.assistantMessage.trim(),
      events,
      resolvedContextHints,
      executionReason: createRun ? decision.executionReason?.trim() : undefined,
      toolParts,
      citations,
      toolCalls,
    };
  }

  /**
   * Streaming turn: emits the canonical conversation event sequence for one
   * assistant reply. Tool gathering uses non-streamed structured decisions
   * (internal reasoning); the final user-facing answer is produced with REAL
   * token streaming so the user sees text appear live.
   *
   * Workflow execution stays out of scope this cycle (`canExecuteWorkflow=false`),
   * so this never promotes the turn to an `AgentRun`. Any failure degrades to a
   * single `message_failed` event — the partial stream stays persisted.
   */
  async *streamTurn(input: OrchestrateMessageInput): AsyncGenerator<OrchestrationEmit> {
    const agent = await this.prisma.companyAgent.findFirst({
      where: { id: input.agentId, organizationId: input.organizationId },
      select: { id: true, name: true, activeVersionId: true, allowedTools: true, status: true },
    });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const allowedTools = this.resolveAllowedTools(agent.allowedTools, agent.status);

    try {
      const setup = await this.buildTurnSetup(input, agent);
      yield { eventType: 'message_stream_started', payload: {} };

      let toolContextFrames: string[] = [];
      const citations: OrchestrationCitation[] = [];

      if (allowedTools.length > 0) {
        const userPermissions = await this.resolveUserPermissions(
          input.organizationId,
          input.userId,
        );
        const gathered = yield* this.streamToolGathering({
          ...setup,
          agentId: input.agentId,
          userId: input.userId,
          allowedTools,
          userPermissions,
        });
        toolContextFrames = gathered.toolContextFrames;
        citations.push(...gathered.citations);
      }

      const mergedContext = this.mergeContext(setup.contextPrompt, toolContextFrames);
      const messages = this.buildConversationalMessages(setup, mergedContext);

      let fullText = '';
      try {
        for await (const chunk of this.aiRuntimeService.streamText({
          organizationId: input.organizationId,
          providerId: setup.configuredTextModel.providerId,
          modelId: setup.configuredTextModel.modelId,
          messages,
          temperature: 0.5,
          maxOutputTokens: 2048,
        })) {
          if (!chunk.delta) continue;
          fullText += chunk.delta;
          yield { eventType: 'message_text_delta', payload: { delta: chunk.delta } };
        }
      } catch (error) {
        this.logger.warn(
          `Streaming final answer failed: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }

      const finalText = fullText.trim();
      if (!finalText) {
        yield { eventType: 'message_text_snapshot', payload: { text: CHAT_CONTINGENCY_MESSAGE } };
      }

      const cleanCitations = this.sanitizeCitations(citations);
      if (cleanCitations.length > 0) {
        yield { eventType: 'citations_emitted', payload: { citations: cleanCitations } };
      }

      yield {
        eventType: 'message_completed',
        payload: { text: finalText || CHAT_CONTINGENCY_MESSAGE, citations: cleanCitations },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao gerar a resposta';
      this.logger.error(`streamTurn failed: ${message}`);
      yield { eventType: 'message_failed', payload: { errorMessage: message } };
    }
  }

  /** Shared turn setup (context, history, model) for streaming + legacy paths. */
  private async buildTurnSetup(
    input: OrchestrateMessageInput,
    agent: { id: string; name: string; activeVersionId: string | null },
  ) {
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

    const rawHistory = input.threadId
      ? await this.loadThreadHistory(input.threadId, input.organizationId)
      : [];
    const history = this.trimDuplicateLatestUserMessage(rawHistory, input.message.trim());
    const configuredTextModel = resolveConfiguredTextModel(activeVersion?.flowDefinition);

    return {
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
      canExecuteWorkflow: false as const,
      workflowObjective: flowConfig.objective,
    };
  }

  /**
   * Streams the tool-gathering phase. Yields the operational narrative and returns
   * the gathered context frames + citations for the final answer.
   */
  private async *streamToolGathering(params: {
    organizationId: string;
    agentId: string;
    userId: string;
    configuredTextModel: { providerId?: string; modelId?: string };
    agentName: string;
    userMessage: string;
    flowConfig: { name: string; objective: string; instructions: string; fallbackMessage: string };
    agentInstructions: string | null;
    agentNotes: string | null;
    contextPrompt: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    canExecuteWorkflow: boolean;
    workflowObjective: string;
    allowedTools: AgentChatToolName[];
    userPermissions: string[];
  }): AsyncGenerator<OrchestrationEmit, { toolContextFrames: string[]; citations: OrchestrationCitation[] }> {
    const toolContextFrames: string[] = [];
    const citations: OrchestrationCitation[] = [];
    const seenCalls = new Set<string>();
    let groupStarted = false;
    let analysisEmitted = false;
    let displayOrder = 0;

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
      const step = await this.decideToolLoopStep({ ...params, toolContextFrames });

      if (step && !analysisEmitted) {
        analysisEmitted = true;
        if (!groupStarted) {
          groupStarted = true;
          yield {
            eventType: 'tool_group_started',
            payload: { groupId: 'tools', label: 'Analisando solicitacao e contexto' },
          };
        }

        const analysis = this.buildNextActionAnalysis(step);
        yield {
          eventType: 'tool_started',
          payload: {
            toolCallId: analysis.toolCallId,
            toolName: NEXT_ACTION_ANALYSIS_TOOL_NAME,
            groupId: 'tools',
            input: analysis.input,
            displayOrder,
          },
        };
        yield {
          eventType: 'tool_completed',
          payload: {
            toolCallId: analysis.toolCallId,
            output: analysis.output,
            resultCount: 0,
          },
        };
        displayOrder += 1;
      }

      if (!step || step.action === 'respond' || step.toolName === 'none') {
        break;
      }

      const toolName = step.toolName;
      if (!params.allowedTools.includes(toolName)) {
        break;
      }

      const query = step.toolQuery.trim() || params.userMessage;
      const dedupeKey = `${toolName}:${query.toLowerCase()}`;
      if (seenCalls.has(dedupeKey)) {
        break;
      }
      seenCalls.add(dedupeKey);

      const toolCallId = `tool-${displayOrder}-${toolName}`;
      yield {
        eventType: 'tool_started',
        payload: { toolCallId, toolName, groupId: 'tools', input: { query }, displayOrder },
      };

      try {
        const result = await this.agentToolRuntime.run({
          organizationId: params.organizationId,
          agentId: params.agentId,
          userId: params.userId,
          allowedTools: params.allowedTools,
          userPermissions: params.userPermissions,
          toolName,
          query,
        });

        citations.push(...result.citations);
        toolContextFrames.push(this.formatToolResultFrame(toolName, query, result));
        yield {
          eventType: 'tool_completed',
          payload: {
            toolCallId,
            output: { summary: result.summary, results: result.results },
            resultCount: result.results.length,
            durationMs: result.metadata.durationMs,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao executar a ferramenta';
        this.logger.warn(`Tool ${toolName} failed during streaming chat: ${message}`);
        toolContextFrames.push(
          `## Falha em ${toolName} (consulta: "${query}")\nA ferramenta não retornou resultados.`,
        );
        yield { eventType: 'tool_failed', payload: { toolCallId, errorMessage: message } };
      }

      displayOrder += 1;
    }

    return { toolContextFrames, citations };
  }

  private buildConversationalMessages(
    setup: {
      agentName: string;
      userMessage: string;
      agentInstructions: string | null;
      flowConfig: { instructions: string };
      history: Array<{ role: 'user' | 'assistant'; content: string }>;
    },
    mergedContext: string,
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const conversationalSystem = [
      `Você é o agente "${setup.agentName}" do Workana AI.`,
      FIRST_PERSON_PERSONA_RULE,
      'Responda ao usuário em português, de forma natural e útil.',
      'Use as instruções e o contexto abaixo. Não mencione JSON, workflow interno nem limitações técnicas.',
      'Quando a pergunta parecer respondível com o contexto da empresa já fornecido, responda com base nele antes de pedir esclarecimentos.',
      'Só peça mais detalhes se o contexto realmente não trouxer nenhum indício útil para avançar.',
      setup.agentInstructions?.trim() ? `Instruções: ${setup.agentInstructions.trim()}` : '',
      setup.flowConfig.instructions?.trim()
        ? `Instruções do fluxo: ${setup.flowConfig.instructions.trim()}`
        : '',
      mergedContext.trim(),
    ]
      .filter(Boolean)
      .join('\n');

    return [
      { role: 'system', content: conversationalSystem },
      ...setup.history.map((entry) => ({ role: entry.role, content: entry.content })),
      { role: 'user', content: setup.userMessage },
    ];
  }

  /** Drops citations the event contract would reject (empty label) and dedupes. */
  private sanitizeCitations(citations: OrchestrationCitation[]): OrchestrationCitation[] {
    const seen = new Set<string>();
    const clean: OrchestrationCitation[] = [];
    for (const citation of citations) {
      const label = citation.label?.trim();
      if (!label) continue;
      const key = `${label}|${citation.url ?? ''}|${citation.sourceType ?? ''}|${citation.sourceId ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      clean.push({ ...citation, label });
    }
    return clean;
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

  private resolveAllowedTools(value: unknown, status?: string | null): AgentChatToolName[] {
    const normalized = Array.isArray(value)
      ? value.filter((tool): tool is AgentChatToolName =>
          READ_ONLY_TOOL_NAMES.includes(tool as AgentChatToolName),
        )
      : [];
    if (normalized.length > 0) {
      return normalized;
    }
    return status === 'active' ? [...DEFAULT_INTERNAL_CHAT_TOOLS] : [];
  }

  private async resolveUserPermissions(organizationId: string, userId: string): Promise<string[]> {
    try {
      return await this.membershipService.getEffectivePermissionKeys(organizationId, userId);
    } catch (error) {
      this.logger.warn(
        `Failed to resolve user permissions for tool runtime: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return [];
    }
  }

  /**
   * Conversational tool loop. Each iteration the model either calls one allowed
   * tool or responds. Tool results are folded back into the prompt context until
   * the model responds or the iteration ceiling is hit. Tool failures degrade the
   * turn instead of failing it.
   */
  private async runToolLoop(params: {
    organizationId: string;
    agentId: string;
    userId: string;
    configuredTextModel: { providerId?: string; modelId?: string };
    agentName: string;
    userMessage: string;
    flowConfig: { name: string; objective: string; instructions: string; fallbackMessage: string };
    agentInstructions: string | null;
    agentNotes: string | null;
    contextPrompt: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    canExecuteWorkflow: boolean;
    workflowObjective: string;
    allowedTools: AgentChatToolName[];
    userPermissions: string[];
  }): Promise<{
    decision: AgentChatTurnDecisionLike;
    toolParts: OrchestrationToolPart[];
    citations: OrchestrationCitation[];
    toolCalls: OrchestrationToolCall[];
  }> {
    const toolParts: OrchestrationToolPart[] = [];
    const citations: OrchestrationCitation[] = [];
    const toolCalls: OrchestrationToolCall[] = [];
    const toolContextFrames: string[] = [];
    const seenCalls = new Set<string>();

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
      const step = await this.decideToolLoopStep({ ...params, toolContextFrames });

      if (!step) {
        break;
      }

      if (step.action === 'respond' || step.toolName === 'none') {
        return {
          decision: this.toFinalDecision(step),
          toolParts,
          citations,
          toolCalls,
        };
      }

      const toolName = step.toolName;
      if (!params.allowedTools.includes(toolName)) {
        // Model asked for a disabled tool — stop the loop and answer with what we have.
        break;
      }

      const query = step.toolQuery.trim() || params.userMessage;
      const dedupeKey = `${toolName}:${query.toLowerCase()}`;
      if (seenCalls.has(dedupeKey)) {
        break;
      }
      seenCalls.add(dedupeKey);

      const index = toolCalls.length;
      try {
        const result = await this.agentToolRuntime.run({
          organizationId: params.organizationId,
          agentId: params.agentId,
          userId: params.userId,
          allowedTools: params.allowedTools,
          userPermissions: params.userPermissions,
          toolName,
          query,
        });

        toolParts.push(this.buildToolPart(index, toolName, query, result, null));
        citations.push(...result.citations);
        toolCalls.push({
          toolName,
          status: 'completed',
          inputPayload: { query },
          outputPayload: { summary: result.summary, results: result.results },
          errorMessage: null,
          durationMs: result.metadata.durationMs,
        });
        toolContextFrames.push(this.formatToolResultFrame(toolName, query, result));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao executar a ferramenta';
        this.logger.warn(`Tool ${toolName} failed during chat loop: ${message}`);
        toolParts.push(this.buildToolPart(index, toolName, query, null, message));
        toolCalls.push({
          toolName,
          status: 'error',
          inputPayload: { query },
          outputPayload: null,
          errorMessage: message,
          durationMs: null,
        });
        toolContextFrames.push(
          `## Falha em ${toolName} (consulta: "${query}")\nA ferramenta não retornou resultados.`,
        );
      }
    }

    // Loop exhausted or stopped — produce a final answer with the gathered context.
    const finalDecision = await this.decideTurnWithAgent({
      organizationId: params.organizationId,
      configuredTextModel: params.configuredTextModel,
      agentName: params.agentName,
      userMessage: params.userMessage,
      flowConfig: params.flowConfig,
      agentInstructions: params.agentInstructions,
      agentNotes: params.agentNotes,
      contextPrompt: this.mergeContext(params.contextPrompt, toolContextFrames),
      history: params.history,
      canExecuteWorkflow: params.canExecuteWorkflow,
      workflowObjective: params.workflowObjective,
    });

    return { decision: finalDecision, toolParts, citations, toolCalls };
  }

  private async decideToolLoopStep(params: {
    organizationId: string;
    configuredTextModel: { providerId?: string; modelId?: string };
    agentName: string;
    userMessage: string;
    flowConfig: { name: string; objective: string; instructions: string; fallbackMessage: string };
    agentInstructions: string | null;
    agentNotes: string | null;
    contextPrompt: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    canExecuteWorkflow: boolean;
    workflowObjective: string;
    allowedTools: AgentChatToolName[];
    toolContextFrames: string[];
  }): Promise<AgentChatToolLoopDecision | null> {
    if (params.toolContextFrames.length === 0) {
      const routingHint = this.inferRoutingHint(params.userMessage, params.allowedTools);
      if (routingHint.recommendedAction !== 'respond' && routingHint.confident) {
        return {
          action: 'tool_call',
          assistantMessage: '',
          decisionReason: routingHint.reason,
          createRun: false,
          executionReason: '',
          toolName: routingHint.recommendedAction,
          toolQuery: routingHint.query,
          events: [{ type: 'intent_classified', label: 'Próxima ação definida' }],
        };
      }
    }

    const messages = [
      { role: 'system' as const, content: this.buildToolLoopSystemPrompt(params) },
      ...params.history.map((entry) => ({ role: entry.role, content: entry.content })),
      { role: 'user' as const, content: params.userMessage },
    ];

    try {
      const result = await this.aiRuntimeService.generateText({
        organizationId: params.organizationId,
        providerId: params.configuredTextModel.providerId,
        modelId: params.configuredTextModel.modelId,
        messages,
        temperature: 0.3,
        maxOutputTokens: 2048,
        structuredOutputSchema: TOOL_LOOP_JSON_SCHEMA as unknown as Record<string, unknown>,
      });

      return this.parseToolLoopDecision(result.text, result.structuredOutput);
    } catch (error) {
      this.logger.warn(
        `Tool-loop decision failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  private parseToolLoopDecision(
    text: string,
    structuredOutput: unknown,
  ): AgentChatToolLoopDecision | null {
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
            // ignore
          }
        }
      }
    }

    for (const candidate of candidates) {
      const parsed = agentChatToolLoopDecisionSchema.safeParse(candidate);
      if (parsed.success) {
        return parsed.data;
      }
    }

    return null;
  }

  private toFinalDecision(step: AgentChatToolLoopDecision): AgentChatTurnDecisionLike {
    const assistantMessage = step.assistantMessage.trim() || this.flowFallback(step);
    const events =
      step.events.length > 0
        ? step.events
        : [{ type: 'intent_classified' as const, label: 'Resposta gerada' }];
    return {
      createRun: step.createRun,
      assistantMessage,
      events,
      executionReason: step.executionReason?.trim() || undefined,
    };
  }

  private flowFallback(step: AgentChatToolLoopDecision): string {
    return step.createRun
      ? 'Vou executar o workflow para concluir essa entrega.'
      : CHAT_CONTINGENCY_MESSAGE;
  }

  private buildToolPart(
    index: number,
    toolName: AgentChatToolName,
    query: string,
    result: AgentToolResult | null,
    errorMessage: string | null,
  ): OrchestrationToolPart {
    return {
      type: 'tool-Search',
      toolCallId: `tool-${index}-${toolName}`,
      state: errorMessage ? 'output-error' : 'output-available',
      input: { query, toolName },
      output: errorMessage
        ? { error: errorMessage }
        : {
            summary: result?.summary ?? '',
            results: result?.results ?? [],
            citations: result?.citations ?? [],
          },
    };
  }

  private formatToolResultFrame(
    toolName: AgentChatToolName,
    query: string,
    result: AgentToolResult,
  ): string {
    const previews = result.results.slice(0, TOOL_RESULT_PREVIEW_COUNT).map((row, i) => {
      const record = row as Record<string, unknown>;
      const label =
        (typeof record.title === 'string' && record.title) ||
        (typeof record.filename === 'string' && record.filename) ||
        (typeof record.url === 'string' && record.url) ||
        `Resultado ${i + 1}`;
      const snippet = typeof record.snippet === 'string' ? record.snippet : '';
      return `- ${label}${snippet ? `: ${snippet.slice(0, TOOL_RESULT_SNIPPET_CHARS)}` : ''}`;
    });

    return [`## ${toolName} (consulta: "${query}")`, result.summary, ...previews]
      .filter(Boolean)
      .join('\n');
  }

  private mergeContext(contextPrompt: string, toolContextFrames: string[]): string {
    if (toolContextFrames.length === 0) {
      return contextPrompt;
    }
    const toolBlock = ['## Resultados de ferramentas', ...toolContextFrames].join('\n\n');
    return contextPrompt.trim() ? `${contextPrompt.trim()}\n\n${toolBlock}` : toolBlock;
  }

  private buildToolLoopSystemPrompt(params: {
    agentName: string;
    userMessage: string;
    flowConfig: { name: string; objective: string; instructions: string; fallbackMessage: string };
    agentInstructions: string | null;
    agentNotes: string | null;
    contextPrompt: string;
    canExecuteWorkflow: boolean;
    workflowObjective: string;
    allowedTools: AgentChatToolName[];
    toolContextFrames: string[];
  }): string {
    const workflowStatus = params.canExecuteWorkflow
      ? 'O workflow está publicado e pode ser executado quando necessário.'
      : 'O workflow ainda não está ativo; NUNCA defina createRun como true.';

    const toolDescriptions = params.allowedTools.map((tool) => `- ${tool}: ${TOOL_LABELS[tool]}`);
    const routingHint = this.inferRoutingHint(params.userMessage, params.allowedTools);
    const recommendedActionLabel =
      routingHint.recommendedAction === 'respond'
        ? 'Responder com o contexto atual'
        : TOOL_LABELS[routingHint.recommendedAction];

    const sections = [
      `Você é o agente "${params.agentName}" do Workana AI.`,
      FIRST_PERSON_PERSONA_RULE,
      'Decida se precisa pesquisar antes de responder ou se já pode responder ao usuário.',
      'Assuma que a empresa possui fontes internas indexadas via RAG e priorize consultá-las antes de pedir esclarecimentos quando a pergunta parecer respondível com esse material.',
      '',
      '## Ferramentas disponíveis',
      ...toolDescriptions,
      '',
      '## Direcao inicial sugerida',
      `Mensagem do usuario: ${params.userMessage}`,
      `Acao sugerida: ${recommendedActionLabel}`,
      `Motivo: ${routingHint.reason}`,
      '',
      '## Regras',
      '- Use action="tool_call" com toolName e toolQuery quando precisar de informação que ainda não tem.',
      '- Preencha decisionReason com uma justificativa curta e concreta da proxima acao.',
      '- Se o usuario pedir informacoes sobre pessoas, historicos, documentos, briefings, contratos, curriculos, arquivos, anexos ou conhecimento interno da empresa, prefira pesquisar antes de perguntar de volta.',
      '- Use rag_search para perguntas sobre contexto, pessoas, processos, historico e conhecimento da empresa.',
      '- Use file_search quando o pedido mencionar arquivo, documento, PDF, planilha, contrato, proposta, anexo, deck, curriculo ou algum material interno especifico.',
      '- Use web_research apenas para fatos externos, publicos, atuais ou explicitamente pedidos na web/internet.',
      '- Não repita a mesma consulta na mesma ferramenta.',
      '- Quando tiver contexto suficiente, use action="respond" com assistantMessage completa em português.',
      '- assistantMessage deve ser natural e útil; nunca mencione JSON, ferramentas internas ou limitações técnicas.',
      '- Evite pedir esclarecimentos antes de tentar a melhor pesquisa interna disponível.',
      '- Defina createRun como true SOMENTE quando o usuário pedir explicitamente uma entrega que depende do workflow operacional.',
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
      `Objetivo: ${params.workflowObjective || params.flowConfig.objective || '(não definido)'}`,
    );

    const mergedContext = this.mergeContext(params.contextPrompt, params.toolContextFrames);
    if (mergedContext.trim()) {
      sections.push('', mergedContext.trim());
    }

    sections.push(
      '',
      'Responda APENAS com o JSON do schema (action, assistantMessage, createRun, executionReason, toolName, toolQuery, events).',
    );

    return sections.join('\n');
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
      FIRST_PERSON_PERSONA_RULE,
      'Responda ao usuário em português, de forma natural e útil.',
      'Use as instruções e o contexto abaixo. Não mencione JSON, workflow interno nem limitações técnicas.',
      'Quando a pergunta parecer respondível com o contexto da empresa já fornecido, responda com base nele antes de pedir esclarecimentos.',
      'Só peça mais detalhes se o contexto realmente não trouxer nenhum indício útil para avançar.',
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
        executionReason: shouldRun
          ? 'Execução inferida após falha do classificador estruturado'
          : undefined,
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
      FIRST_PERSON_PERSONA_RULE,
      'Sua função neste turno é conversar com o usuário e decidir se a mensagem exige executar o workflow operacional do agente.',
      '',
      '## Regras',
      '- SEMPRE preencha assistantMessage com uma resposta natural, útil e em português — nunca uma mensagem genérica de placeholder.',
      '- Use as instruções do agente, do workflow e o contexto recuperado para responder perguntas, orientar e esclarecer.',
      '- Quando a pergunta parecer respondível com o contexto da empresa já recuperado, responda com base nele antes de pedir mais detalhes.',
      '- Só peça esclarecimentos se o contexto disponível realmente não trouxer nenhum indício útil para avançar.',
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
          ['intent_classified', 'context_loaded', 'context_read', 'execution_decided'].includes(
            row.type,
          )
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
      executionReason: typeof record.executionReason === 'string' ? record.executionReason : '',
      events:
        mappedEvents.length > 0
          ? mappedEvents
          : [{ type: 'intent_classified', label: 'Intenção analisada' }],
    };
  }

  private inferRoutingHint(userMessage: string, allowedTools: AgentChatToolName[]): RoutingHint {
    const message = userMessage.trim();
    const normalized = this.normalizeForRouting(message);
    const hasTool = (tool: AgentChatToolName) => allowedTools.includes(tool);

    const isSmallTalk =
      /^(oi|ola|ol[áa]|bom dia|boa tarde|boa noite|e ai|ei|hey|obrigado|obrigada|valeu|tudo bem)/.test(
        normalized,
      ) && normalized.split(/\s+/).length <= 6;
    if (isSmallTalk) {
      return {
        recommendedAction: 'respond',
        reason: 'A mensagem e conversacional e pode ser respondida sem nova pesquisa.',
        query: '',
        confident: true,
      };
    }

    // Perguntas sobre a identidade/função do próprio agente: ele já sabe quem é
    // pelo nome e pelas instruções, então pesquisar contexto da empresa é ruído.
    const isIdentityQuestion =
      /\b(voce|vc) (e|eh) (um |uma )?(agente|assistente|ia|bot|rob[oô])\b/.test(normalized) ||
      /\b(o que|oque|oq|que) (voce|vc) (e|eh|faz|pode fazer|sabe fazer|consegue fazer)\b/.test(
        normalized,
      ) ||
      /\bquem (e|eh|es) (voce|vc)\b/.test(normalized) ||
      /\bqual (e |eh )?(o |a )?(seu|sua) (papel|funcao|objetivo|proposito|especialidade)\b/.test(
        normalized,
      ) ||
      /\bpara que (voce|vc) serve\b/.test(normalized) ||
      /\b(voce|vc) (e|eh) (um |uma )?agente de\b/.test(normalized);
    if (isIdentityQuestion) {
      return {
        recommendedAction: 'respond',
        reason: 'A pergunta e sobre a identidade ou funcao do proprio agente, que ele ja conhece — nao precisa consultar o contexto da empresa.',
        query: '',
        confident: true,
      };
    }

    const mentionsExternalSource =
      /(internet|na web|no google|google|site|sites|noticia|noticias|linkedin|wikipedia|mercado|concorrente|concorrentes|tendencia|tendencias|hoje|recente|atualizado|atualizada)/.test(
        normalized,
      );
    if (mentionsExternalSource && hasTool('web_research')) {
      return {
        recommendedAction: 'web_research',
        reason: 'O pedido aponta para informacoes externas ou atuais, entao a melhor proxima acao e pesquisar fontes publicas.',
        query: message,
        confident: true,
      };
    }

    const mentionsFileLikeSource =
      /(arquivo|arquivos|documento|documentos|pdf|planilha|xlsx|csv|slide|slides|apresentacao|apresentacoes|contrato|contratos|proposta|propostas|anexo|anexos|curriculo|curriculos|cv|deck|briefing|relatorio|relatorios|ata|docx)/.test(
        normalized,
      );
    if (mentionsFileLikeSource && hasTool('file_search')) {
      return {
        recommendedAction: 'file_search',
        reason: 'A pergunta menciona um arquivo ou documento interno, entao devo procurar primeiro nas fontes da empresa.',
        query: message,
        confident: true,
      };
    }

    const mentionsInternalKnowledge =
      /(empresa|companhia|negocio|cliente|clientes|historico|processo|processos|politica|politicas|regra|regras|equipe|time|projeto|projetos|briefing|contexto|onboarding|marca|produto|produtos|servico|servicos|fornecedor|fornecedores)/.test(
        normalized,
      );
    if (mentionsInternalKnowledge && hasTool('rag_search')) {
      return {
        recommendedAction: 'rag_search',
        reason: 'A pergunta parece depender de conhecimento interno da empresa, entao devo consultar o contexto indexado antes de responder.',
        query: message,
        confident: true,
      };
    }

    if (hasTool('rag_search')) {
      // Fallback genérico: sem sinal forte, sugerimos RAG mas deixamos o modelo
      // decidir (confident=false) para não pesquisar à toa em perguntas abertas.
      return {
        recommendedAction: 'rag_search',
        reason: 'A pergunta parece depender de conhecimento interno da empresa, entao devo consultar o contexto indexado antes de responder.',
        query: message,
        confident: false,
      };
    }

    if (hasTool('file_search')) {
      return {
        recommendedAction: 'file_search',
        reason: 'Nao ha busca semantica habilitada, entao a melhor alternativa interna e procurar nos arquivos e documentos da empresa.',
        query: message,
        confident: false,
      };
    }

    return {
      recommendedAction: 'respond',
      reason: 'Nao ha ferramenta interna habilitada mais adequada para pesquisar antes da resposta.',
      query: '',
      confident: true,
    };
  }

  private buildNextActionAnalysis(step: AgentChatToolLoopDecision): {
    toolCallId: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  } {
    const nextActionLabel =
      step.action === 'tool_call' && step.toolName !== 'none'
        ? TOOL_LABELS[step.toolName]
        : 'Responder com o contexto atual';

    return {
      toolCallId: 'tool-next-action-analysis',
      input: {
        query: nextActionLabel,
        toolName: NEXT_ACTION_ANALYSIS_TOOL_NAME,
      },
      output: {
        summary: step.decisionReason.trim() || 'A proxima acao do turno foi definida.',
        action: step.action,
        selectedTool: step.toolName,
        toolQuery: step.toolQuery,
      },
    };
  }

  private normalizeForRouting(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
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
