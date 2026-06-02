import { NotFoundException } from '@nestjs/common';
import { AgentChatOrchestratorService } from './agent-chat-orchestrator.service';
import type { OrchestrationEmit } from './dto/agent-chat-orchestration.dto';

async function drain(gen: AsyncGenerator<OrchestrationEmit>): Promise<OrchestrationEmit[]> {
  const events: OrchestrationEmit[] = [];
  for await (const e of gen) events.push(e);
  return events;
}

const toolLoopDecision = (overrides: Record<string, unknown>) => ({
  text: '',
  structuredOutput: {
    action: 'respond',
    assistantMessage: '',
    decisionReason: '',
    createRun: false,
    executionReason: '',
    toolName: 'none',
    toolQuery: '',
    events: [],
    ...overrides,
  },
});

function makeService(opts: {
  allowedTools?: string[];
  status?: string;
  streamText?: () => AsyncGenerator<{ delta: string }>;
  generateText?: jest.Mock;
  toolRun?: jest.Mock;
}) {
  const prisma = {
    companyAgent: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'agent-1',
        name: 'Agente X',
        activeVersionId: null,
        allowedTools: opts.allowedTools ?? [],
        status: opts.status ?? 'draft',
      }),
    },
    agentVersion: { findFirst: jest.fn().mockResolvedValue(null) },
    agentChatThread: { findFirst: jest.fn().mockResolvedValue(null) },
    agentChatMessage: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const aiRuntimeService = {
    generateText: opts.generateText ?? jest.fn(),
    streamText:
      opts.streamText ??
      async function* () {
        yield { delta: 'Ola ' };
        yield { delta: 'mundo' };
      },
  };
  const agentContextService = {
    resolveForRun: jest
      .fn()
      .mockResolvedValue({ agentProfile: { instructions: null, notes: null } }),
  };
  const ragContextAssemblyService = {
    assemble: jest.fn().mockResolvedValue({ query: 'q', chunks: [], totalFound: 0, metadata: {} }),
    formatForPrompt: jest.fn().mockReturnValue(''),
  };
  const agentToolRuntime = {
    run: opts.toolRun ?? jest.fn(),
  };
  const membershipService = {
    getEffectivePermissionKeys: jest.fn().mockResolvedValue(['context.read', 'brain.read']),
  };

  const service = new AgentChatOrchestratorService(
    prisma as any,
    aiRuntimeService as any,
    agentContextService as any,
    ragContextAssemblyService as any,
    agentToolRuntime as any,
    membershipService as any,
  );
  return { service, prisma, aiRuntimeService, agentToolRuntime };
}

const INPUT = {
  organizationId: 'org-1',
  agentId: 'agent-1',
  userId: 'user-1',
  message: 'Oi, tudo bem?',
};

describe('AgentChatOrchestratorService.streamTurn', () => {
  it('emits start → text deltas → completed for a tool-less conversational turn', async () => {
    const { service } = makeService({ allowedTools: [] });
    const events = await drain(service.streamTurn(INPUT));
    const types = events.map((e) => e.eventType);

    expect(types[0]).toBe('message_stream_started');
    expect(types[types.length - 1]).toBe('message_completed');
    expect(types).not.toContain('tool_started');

    const deltas = events
      .filter((e) => e.eventType === 'message_text_delta')
      .map((e) => e.payload.delta);
    expect(deltas.join('')).toBe('Ola mundo');

    const completed = events.find((e) => e.eventType === 'message_completed');
    expect(completed?.payload.text).toBe('Ola mundo');
  });

  it('emits the full tool narrative and citations when a tool runs', async () => {
    const generateText = jest
      .fn()
      .mockResolvedValueOnce(
        toolLoopDecision({ action: 'tool_call', toolName: 'rag_search', toolQuery: 'empresa' }),
      )
      .mockResolvedValueOnce(toolLoopDecision({ action: 'respond' }));
    const toolRun = jest.fn().mockResolvedValue({
      toolName: 'rag_search',
      summary: 'Encontrei contexto',
      results: [{ title: 'Brain', snippet: 'algo' }],
      citations: [{ label: 'Brain', sourceType: 'brain_entry', sourceId: 'b1' }],
      metadata: { durationMs: 42, resultCount: 1 },
    });
    const { service } = makeService({ allowedTools: ['rag_search'], generateText, toolRun });

    const events = await drain(service.streamTurn(INPUT));
    const types = events.map((e) => e.eventType);

    expect(types).toEqual([
      'message_stream_started',
      'tool_group_started',
      'tool_started',
      'tool_completed',
      'tool_started',
      'tool_completed',
      'message_text_delta',
      'message_text_delta',
      'citations_emitted',
      'message_completed',
    ]);

    const started = events.filter((e) => e.eventType === 'tool_started');
    expect(started[0]?.payload).toMatchObject({
      toolName: 'next_action_analysis',
      input: { query: 'Consultou contexto da empresa' },
    });
    expect(started[1]?.payload).toMatchObject({ toolName: 'rag_search', input: { query: 'empresa' } });
    const citations = events.find((e) => e.eventType === 'citations_emitted');
    expect(citations?.payload.citations).toEqual([
      { label: 'Brain', sourceType: 'brain_entry', sourceId: 'b1' },
    ]);
    expect(toolRun).toHaveBeenCalledTimes(1);
  });

  it('falls back to the default internal tools for active agents with an empty allowlist', async () => {
    const generateText = jest
      .fn()
      .mockResolvedValueOnce(
        toolLoopDecision({
          action: 'tool_call',
          decisionReason: 'A pergunta depende de contexto interno.',
          toolName: 'rag_search',
          toolQuery: 'politica da empresa',
        }),
      )
      .mockResolvedValueOnce(toolLoopDecision({ action: 'respond' }));
    const toolRun = jest.fn().mockResolvedValue({
      toolName: 'rag_search',
      summary: 'Encontrei contexto',
      results: [{ title: 'Politica', snippet: '...' }],
      citations: [{ label: 'Politica', sourceType: 'brain_entry', sourceId: 'b1' }],
      metadata: { durationMs: 10, resultCount: 1 },
    });

    const { service } = makeService({
      allowedTools: [],
      status: 'active',
      generateText,
      toolRun,
    });

    const events = await drain(service.streamTurn(INPUT));

    expect(events.some((event) => event.eventType === 'tool_started')).toBe(true);
    expect(toolRun).toHaveBeenCalledWith(
      expect.objectContaining({ toolName: 'rag_search', allowedTools: ['rag_search', 'file_search'] }),
    );
  });

  it('emits the visible next-action analysis even when the loop decides to respond directly', async () => {
    const generateText = jest.fn().mockResolvedValueOnce(
      toolLoopDecision({
        action: 'respond',
        decisionReason: 'A pergunta pode ser respondida com o contexto atual.',
      }),
    );
    const { service } = makeService({ allowedTools: ['rag_search'], generateText });

    const events = await drain(service.streamTurn(INPUT));
    const types = events.map((e) => e.eventType);

    expect(types).toEqual([
      'message_stream_started',
      'tool_group_started',
      'tool_started',
      'tool_completed',
      'message_text_delta',
      'message_text_delta',
      'message_completed',
    ]);

    const analysisCompleted = events.find(
      (event) =>
        event.eventType === 'tool_completed' &&
        event.payload.toolCallId === 'tool-next-action-analysis',
    );
    expect(analysisCompleted?.payload.output).toMatchObject({
      action: 'respond',
      selectedTool: 'none',
      summary: 'A pergunta pode ser respondida com o contexto atual.',
    });
  });

  it('streams file_search when the decision chooses an internal document lookup', async () => {
    const generateText = jest
      .fn()
      .mockResolvedValueOnce(
        toolLoopDecision({
          action: 'tool_call',
          decisionReason: 'A pergunta menciona um documento interno especifico.',
          toolName: 'file_search',
          toolQuery: 'curriculo do adryan',
        }),
      )
      .mockResolvedValueOnce(toolLoopDecision({ action: 'respond' }));
    const toolRun = jest.fn().mockResolvedValue({
      toolName: 'file_search',
      summary: 'Encontrei arquivos relacionados',
      results: [{ filename: 'curriculo-adryan.pdf', snippet: 'Experiencia relevante' }],
      citations: [
        { label: 'curriculo-adryan.pdf', sourceType: 'agent_context_file', sourceId: 'file-1' },
      ],
      metadata: { durationMs: 31, resultCount: 1 },
    });
    const { service } = makeService({ allowedTools: ['file_search'], generateText, toolRun });

    const events = await drain(service.streamTurn(INPUT));

    const started = events.filter((event) => event.eventType === 'tool_started');
    expect(started).toHaveLength(2);
    expect(started[0]?.payload).toMatchObject({
      toolName: 'next_action_analysis',
      input: { query: 'Pesquisou arquivos do contexto' },
    });
    expect(started[1]?.payload).toMatchObject({
      toolName: 'file_search',
      input: { query: 'curriculo do adryan' },
    });
  });

  it('degrades gracefully when a tool fails: emits tool_failed but still completes the message', async () => {
    const generateText = jest
      .fn()
      .mockResolvedValueOnce(
        toolLoopDecision({ action: 'tool_call', toolName: 'web_research', toolQuery: 'noticia' }),
      )
      .mockResolvedValueOnce(toolLoopDecision({ action: 'respond' }));
    const toolRun = jest.fn().mockRejectedValue(new Error('provider down'));
    const { service } = makeService({ allowedTools: ['web_research'], generateText, toolRun });

    const events = await drain(service.streamTurn(INPUT));
    const types = events.map((e) => e.eventType);

    expect(types).toContain('tool_failed');
    expect(types).toContain('message_completed');
    const completedTools = events.filter((e) => e.eventType === 'tool_completed');
    expect(completedTools).toHaveLength(1);
    expect(completedTools[0]?.payload.toolCallId).toBe('tool-next-action-analysis');
    const failed = events.find((e) => e.eventType === 'tool_failed');
    expect(failed?.payload.errorMessage).toBe('provider down');
  });

  it('falls back to a contingency snapshot when the final stream yields nothing', async () => {
    const { service } = makeService({
      allowedTools: [],
      // biome-ignore lint/correctness/useYield: generator intentionally throws before yielding to simulate a provider failure
      streamText: async function* () {
        throw new Error('LLM exploded');
      },
    });

    const events = await drain(service.streamTurn(INPUT));
    const types = events.map((e) => e.eventType);

    expect(types).toContain('message_text_snapshot');
    expect(types[types.length - 1]).toBe('message_completed');
    // The whole turn still resolves into a usable message, never a hard crash.
    const completed = events.find((e) => e.eventType === 'message_completed');
    expect(typeof completed?.payload.text).toBe('string');
    expect((completed?.payload.text as string).length).toBeGreaterThan(0);
    expect(types).not.toContain('message_failed');
  });

  it('throws NotFound when the agent does not exist (before any event)', async () => {
    const { service, prisma } = makeService({ allowedTools: [] });
    prisma.companyAgent.findFirst.mockResolvedValue(null);
    await expect(drain(service.streamTurn(INPUT))).rejects.toBeInstanceOf(NotFoundException);
  });
});
