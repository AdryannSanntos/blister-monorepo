import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConversationSseService } from '../conversation/conversation-sse.service';
import { ConversationService } from '../conversation/conversation.service';
import { PrismaService } from '../prisma/prisma.service';
import { AgentChatOrchestratorService } from './agent-chat-orchestrator.service';
import { AgentChatService } from './agent-chat.service';
import { AgentIntentService } from './agent-intent.service';
import { AgentRunsService } from './agent-runs.service';
import { SystemAgentsService } from './system-agents/system-agents.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeMockPrisma = () => ({
  agentChatThread: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  agentChatMessage: {
    create: jest.fn(),
    createMany: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  agentRun: {
    findFirst: jest.fn(),
  },
  companyAgent: {
    findFirst: jest.fn(),
  },
  agentChatToolCall: {
    createMany: jest.fn(),
  },
  $transaction: jest.fn(),
});

const makeMockIntentService = () => ({
  classify: jest.fn().mockResolvedValue({ mode: 'execution', reason: 'task_requested' }),
});

const makeMockOrchestratorService = () => ({
  orchestrateMessage: jest.fn().mockResolvedValue({
    mode: 'execution',
    createRun: true,
    assistantMessage: 'Vou executar o workflow para esta entrega.',
    events: [],
    resolvedContextHints: [],
    executionReason: 'task_requested',
  }),
});

const makeMockRunsService = () => ({
  createQueuedRun: jest.fn().mockResolvedValue({ id: 'run-1', status: 'queued' }),
});

const makeMockConversationService = () => ({
  appendEvent: jest.fn().mockResolvedValue({ event: { sequence: 1 }, projection: {} }),
  getThreadReplay: jest
    .fn()
    .mockResolvedValue({ threadId: 'thread-1', lastSequence: 0, messages: [] }),
});

const makeMockSystemAgentsService = () => ({
  generateThreadTitle: jest.fn().mockResolvedValue({
    agentKey: 'thread-title',
    status: 'failed',
    data: null,
    errorMessage: null,
    startedAt: new Date(0).toISOString(),
    finishedAt: new Date(0).toISOString(),
  }),
  generateInitialMessages: jest.fn().mockResolvedValue({
    agentKey: 'initial-messages',
    status: 'failed',
    data: null,
    errorMessage: null,
    startedAt: new Date(0).toISOString(),
    finishedAt: new Date(0).toISOString(),
  }),
});

const makeMockSse = () => ({ writeEvent: jest.fn() });

const THREAD = {
  id: 'thread-1',
  organizationId: 'org-1',
  agentId: 'agent-1',
  scope: 'agent_chat',
  createdByUserId: 'user-1',
};

const MESSAGE = {
  id: 'msg-1',
  threadId: 'thread-1',
  role: 'user',
  content: 'Monte um plano',
  metadata: { attachments: [] },
  createdByUserId: 'user-1',
  createdAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// AgentChatService — createThread
// ---------------------------------------------------------------------------

describe('AgentChatService.createThread', () => {
  let service: AgentChatService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentChatService,
        { provide: PrismaService, useValue: prisma },
        { provide: AgentIntentService, useValue: makeMockIntentService() },
        { provide: AgentChatOrchestratorService, useValue: makeMockOrchestratorService() },
        { provide: SystemAgentsService, useValue: makeMockSystemAgentsService() },
        { provide: ConversationService, useValue: makeMockConversationService() },
        { provide: ConversationSseService, useValue: makeMockSse() },
        { provide: AgentRunsService, useValue: makeMockRunsService() },
      ],
    }).compile();
    service = module.get(AgentChatService);
  });

  afterEach(() => jest.clearAllMocks());

  it('creates thread for valid agent in organization', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({ id: 'agent-1' });
    prisma.agentChatThread.create.mockResolvedValue({ id: 'thread-1', scope: 'agent_chat' });

    const result = await service.createThread('org-1', 'user-1', {
      agentId: 'agent-1',
      scope: 'agent_chat',
    });

    expect(prisma.agentChatThread.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        agentId: 'agent-1',
        createdByUserId: 'user-1',
      }),
    });
    expect(result.id).toBe('thread-1');
  });

  it('throws NotFoundException when agentId does not belong to organization', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue(null);

    await expect(
      service.createThread('org-1', 'user-1', { agentId: 'agent-other-org', scope: 'agent_chat' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates thread without agentId (company_chat scope)', async () => {
    prisma.agentChatThread.create.mockResolvedValue({ id: 'thread-1', scope: 'company_chat' });

    const result = await service.createThread('org-1', 'user-1', { scope: 'company_chat' });

    expect(prisma.companyAgent.findFirst).not.toHaveBeenCalled();
    expect(result.id).toBe('thread-1');
  });
});

// ---------------------------------------------------------------------------
// AgentChatService — createUserMessageAndProcess
// ---------------------------------------------------------------------------

describe('AgentChatService.createUserMessageAndProcess', () => {
  let service: AgentChatService;
  let prisma: ReturnType<typeof makeMockPrisma>;
  let intentService: ReturnType<typeof makeMockIntentService>;
  let runsService: ReturnType<typeof makeMockRunsService>;
  let orchestratorService: ReturnType<typeof makeMockOrchestratorService>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    intentService = makeMockIntentService();
    runsService = makeMockRunsService();
    orchestratorService = makeMockOrchestratorService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentChatService,
        { provide: PrismaService, useValue: prisma },
        { provide: AgentIntentService, useValue: intentService },
        { provide: AgentRunsService, useValue: runsService },
        { provide: AgentChatOrchestratorService, useValue: orchestratorService },
        { provide: SystemAgentsService, useValue: makeMockSystemAgentsService() },
        { provide: ConversationService, useValue: makeMockConversationService() },
        { provide: ConversationSseService, useValue: makeMockSse() },
      ],
    }).compile();
    service = module.get(AgentChatService);
  });

  afterEach(() => jest.clearAllMocks());

  it('saves message and creates run when intent is execution', async () => {
    prisma.agentChatThread.findUnique.mockResolvedValue(THREAD);
    prisma.agentChatMessage.create.mockResolvedValue(MESSAGE);
    prisma.agentRun.findFirst.mockResolvedValue(null);
    intentService.classify.mockResolvedValue({ mode: 'execution', reason: 'task_requested' });

    const result = await service.createUserMessageAndProcess('org-1', 'user-1', {
      threadId: 'thread-1',
      content: 'Monte um plano de execução',
    });

    expect(prisma.agentChatMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ role: 'user', content: 'Monte um plano de execução' }),
    });
    expect(runsService.createQueuedRun).toHaveBeenCalledWith(
      'org-1',
      'agent-1',
      'user-1',
      expect.objectContaining({ input: expect.objectContaining({ threadId: 'thread-1' }) }),
    );
    expect(result.run).not.toBeNull();
  });

  it('saves message but skips run when intent is conversational', async () => {
    prisma.agentChatThread.findUnique.mockResolvedValue(THREAD);
    prisma.agentChatMessage.create.mockResolvedValue(MESSAGE);
    orchestratorService.orchestrateMessage.mockResolvedValue({
      mode: 'conversation',
      createRun: false,
      assistantMessage: 'Olá! Como posso ajudar?',
      events: [],
      resolvedContextHints: [],
    });

    const result = await service.createUserMessageAndProcess('org-1', 'user-1', {
      threadId: 'thread-1',
      content: 'Oi',
    });

    expect(runsService.createQueuedRun).not.toHaveBeenCalled();
    expect(result.run).toBeNull();
  });

  it('persists tool parts in metadata and audit rows for read-only tool usage', async () => {
    prisma.agentChatThread.findUnique.mockResolvedValue(THREAD);
    prisma.agentChatMessage.create.mockResolvedValue(MESSAGE);
    orchestratorService.orchestrateMessage.mockResolvedValue({
      mode: 'context_retrieval',
      createRun: false,
      assistantMessage: 'O reembolso acontece em até 7 dias.',
      events: [],
      resolvedContextHints: [],
      toolParts: [
        {
          type: 'tool-Search',
          toolCallId: 'tool-0-rag_search',
          state: 'output-available',
          input: { query: 'reembolso', toolName: 'rag_search' },
          output: { summary: 'Encontrado', results: [], citations: [] },
        },
      ],
      citations: [{ label: 'Reembolsos', sourceType: 'brain_entry' }],
      toolCalls: [
        {
          toolName: 'rag_search',
          status: 'completed',
          inputPayload: { query: 'reembolso' },
          outputPayload: { summary: 'Encontrado', results: [] },
          errorMessage: null,
          durationMs: 12,
        },
      ],
    });

    const result = await service.createUserMessageAndProcess('org-1', 'user-1', {
      threadId: 'thread-1',
      content: 'qual a política de reembolso?',
    });

    expect(result.run).toBeNull();
    expect(runsService.createQueuedRun).not.toHaveBeenCalled();

    const assistantCreateCall = prisma.agentChatMessage.create.mock.calls.find(
      ([arg]) => arg.data.role === 'assistant',
    );
    expect(assistantCreateCall?.[0].data.metadata).toMatchObject({
      toolParts: expect.arrayContaining([expect.objectContaining({ type: 'tool-Search' })]),
      citations: expect.arrayContaining([expect.objectContaining({ label: 'Reembolsos' })]),
    });

    expect(prisma.agentChatToolCall.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          organizationId: 'org-1',
          agentId: 'agent-1',
          threadId: 'thread-1',
          messageId: MESSAGE.id,
          toolName: 'rag_search',
          status: 'completed',
          createdByUserId: 'user-1',
        }),
      ],
    });
  });

  it('throws NotFoundException when thread does not exist', async () => {
    prisma.agentChatThread.findUnique.mockResolvedValue(null);

    await expect(
      service.createUserMessageAndProcess('org-1', 'user-1', {
        threadId: 'nonexistent',
        content: 'Teste',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when thread belongs to different organization', async () => {
    prisma.agentChatThread.findUnique.mockResolvedValue({ ...THREAD, organizationId: 'org-other' });

    await expect(
      service.createUserMessageAndProcess('org-1', 'user-1', {
        threadId: 'thread-1',
        content: 'Teste',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when thread already has active run', async () => {
    prisma.agentChatThread.findUnique.mockResolvedValue(THREAD);
    prisma.agentChatMessage.create.mockResolvedValue(MESSAGE);
    prisma.agentRun.findFirst.mockResolvedValue({ id: 'run-active', status: 'running' });
    intentService.classify.mockResolvedValue({ mode: 'execution', reason: 'task_requested' });

    await expect(
      service.createUserMessageAndProcess('org-1', 'user-1', {
        threadId: 'thread-1',
        content: 'Outro plano',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('does not create run when thread has no agentId (company chat)', async () => {
    prisma.agentChatThread.findUnique.mockResolvedValue({ ...THREAD, agentId: null });
    prisma.agentChatMessage.create.mockResolvedValue(MESSAGE);
    intentService.classify.mockResolvedValue({ mode: 'execution', reason: 'task_requested' });

    const result = await service.createUserMessageAndProcess('org-1', 'user-1', {
      threadId: 'thread-1',
      content: 'Tarefa sem agente',
    });

    expect(runsService.createQueuedRun).not.toHaveBeenCalled();
    expect(result.run).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AgentChatService — editMessageAndBranch
// ---------------------------------------------------------------------------

describe('AgentChatService.editMessageAndBranch', () => {
  let service: AgentChatService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) =>
      cb(prisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentChatService,
        { provide: PrismaService, useValue: prisma },
        { provide: AgentIntentService, useValue: makeMockIntentService() },
        { provide: AgentChatOrchestratorService, useValue: makeMockOrchestratorService() },
        { provide: SystemAgentsService, useValue: makeMockSystemAgentsService() },
        { provide: ConversationService, useValue: makeMockConversationService() },
        { provide: ConversationSseService, useValue: makeMockSse() },
        { provide: AgentRunsService, useValue: makeMockRunsService() },
      ],
    }).compile();
    service = module.get(AgentChatService);
  });

  afterEach(() => jest.clearAllMocks());

  it('creates branch thread for user message', async () => {
    prisma.agentChatMessage.findFirst.mockResolvedValue({ ...MESSAGE, role: 'user' });
    prisma.agentChatThread.findUnique.mockResolvedValue(THREAD);
    prisma.agentChatThread.create.mockResolvedValue({ id: 'branch-1', parentThreadId: 'thread-1' });
    prisma.agentChatMessage.findMany.mockResolvedValue([]);
    prisma.agentChatMessage.create.mockResolvedValue({ id: 'new-msg-1' });

    const result = await service.editMessageAndBranch(
      'org-1',
      { threadId: 'thread-1', messageId: 'msg-1', content: 'Nova versão' },
      'user-1',
    );

    expect(prisma.agentChatThread.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ parentThreadId: 'thread-1', organizationId: 'org-1' }),
    });
    expect(result.branchId).toBe('branch-1');
  });

  it('throws NotFoundException when message does not exist', async () => {
    prisma.agentChatMessage.findFirst.mockResolvedValue(null);

    await expect(
      service.editMessageAndBranch(
        'org-1',
        { threadId: 'thread-1', messageId: 'ghost', content: 'Edit' },
        'user-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when trying to branch from assistant message', async () => {
    prisma.agentChatMessage.findFirst.mockResolvedValue({ ...MESSAGE, role: 'assistant' });

    await expect(
      service.editMessageAndBranch(
        'org-1',
        { threadId: 'thread-1', messageId: 'msg-1', content: 'Edit' },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when thread belongs to different organization', async () => {
    prisma.agentChatMessage.findFirst.mockResolvedValue({ ...MESSAGE, role: 'user' });
    prisma.agentChatThread.findUnique.mockResolvedValue({ ...THREAD, organizationId: 'org-evil' });

    await expect(
      service.editMessageAndBranch(
        'org-1',
        { threadId: 'thread-1', messageId: 'msg-1', content: 'Edit' },
        'user-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when user does not own the thread', async () => {
    prisma.agentChatMessage.findFirst.mockResolvedValue({ ...MESSAGE, role: 'user' });
    prisma.agentChatThread.findUnique.mockResolvedValue({
      ...THREAD,
      createdByUserId: 'user-other',
    });

    await expect(
      service.editMessageAndBranch(
        'org-1',
        { threadId: 'thread-1', messageId: 'msg-1', content: 'Hack attempt' },
        'user-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('copies prior messages into new branch', async () => {
    const priorMsg = { ...MESSAGE, id: 'prior-msg', role: 'user', content: 'Mensagem anterior' };
    prisma.agentChatMessage.findFirst.mockResolvedValue({ ...MESSAGE, role: 'user' });
    prisma.agentChatThread.findUnique.mockResolvedValue(THREAD);
    prisma.agentChatThread.create.mockResolvedValue({ id: 'branch-1', parentThreadId: 'thread-1' });
    prisma.agentChatMessage.findMany.mockResolvedValue([priorMsg]);
    prisma.agentChatMessage.createMany.mockResolvedValue({ count: 1 });
    prisma.agentChatMessage.create.mockResolvedValue({ id: 'new-msg-1' });

    await service.editMessageAndBranch(
      'org-1',
      { threadId: 'thread-1', messageId: 'msg-1', content: 'Nova' },
      'user-1',
    );

    // prior messages copiadas via createMany em batch
    expect(prisma.agentChatMessage.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ content: 'Mensagem anterior', threadId: 'branch-1' }),
      ]),
    });
    // a mensagem editada + resposta são produzidas pelo stream depois, não aqui
    expect(prisma.agentChatMessage.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AgentChatService — listMessages (isolation)
// ---------------------------------------------------------------------------

describe('AgentChatService.listMessages', () => {
  let service: AgentChatService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentChatService,
        { provide: PrismaService, useValue: prisma },
        { provide: AgentIntentService, useValue: makeMockIntentService() },
        { provide: AgentChatOrchestratorService, useValue: makeMockOrchestratorService() },
        { provide: SystemAgentsService, useValue: makeMockSystemAgentsService() },
        { provide: ConversationService, useValue: makeMockConversationService() },
        { provide: ConversationSseService, useValue: makeMockSse() },
        { provide: AgentRunsService, useValue: makeMockRunsService() },
      ],
    }).compile();
    service = module.get(AgentChatService);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns messages for thread owned by user', async () => {
    prisma.agentChatThread.findFirst.mockResolvedValue({
      id: 'thread-1',
      createdByUserId: 'user-1',
    });
    prisma.agentChatMessage.findMany.mockResolvedValue([MESSAGE]);

    const result = await service.listMessages('org-1', 'thread-1', 'user-1', { limit: 50 });

    expect(result.messages).toHaveLength(1);
  });

  it('throws NotFoundException when thread does not exist', async () => {
    prisma.agentChatThread.findFirst.mockResolvedValue(null);

    await expect(
      service.listMessages('org-1', 'ghost-thread', 'user-1', { limit: 50 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when user does not own the thread (data isolation)', async () => {
    prisma.agentChatThread.findFirst.mockResolvedValue({
      id: 'thread-1',
      createdByUserId: 'user-other',
    });

    await expect(
      service.listMessages('org-1', 'thread-1', 'user-1', { limit: 50 }),
    ).rejects.toThrow(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// AgentChatService — deleteThread
// ---------------------------------------------------------------------------

describe('AgentChatService.deleteThread', () => {
  let service: AgentChatService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentChatService,
        { provide: PrismaService, useValue: prisma },
        { provide: AgentIntentService, useValue: makeMockIntentService() },
        { provide: AgentChatOrchestratorService, useValue: makeMockOrchestratorService() },
        { provide: SystemAgentsService, useValue: makeMockSystemAgentsService() },
        { provide: ConversationService, useValue: makeMockConversationService() },
        { provide: ConversationSseService, useValue: makeMockSse() },
        { provide: AgentRunsService, useValue: makeMockRunsService() },
      ],
    }).compile();
    service = module.get(AgentChatService);
  });

  afterEach(() => jest.clearAllMocks());

  it('deletes thread owned by user in organization', async () => {
    prisma.agentChatThread.findFirst.mockResolvedValue({ id: 'thread-1' });
    prisma.agentRun.findFirst.mockResolvedValue(null);
    prisma.agentChatThread.delete.mockResolvedValue({ id: 'thread-1' });

    const result = await service.deleteThread('org-1', 'agent-1', 'thread-1', 'user-1');

    expect(prisma.agentChatThread.delete).toHaveBeenCalledWith({ where: { id: 'thread-1' } });
    expect(result.id).toBe('thread-1');
  });

  it('throws NotFoundException when thread not found or wrong owner', async () => {
    prisma.agentChatThread.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteThread('org-1', 'agent-1', 'thread-1', 'user-hacker'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when thread has active run', async () => {
    prisma.agentChatThread.findFirst.mockResolvedValue({ id: 'thread-1' });
    prisma.agentRun.findFirst.mockResolvedValue({ id: 'run-active', status: 'running' });

    await expect(service.deleteThread('org-1', 'agent-1', 'thread-1', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});

// ---------------------------------------------------------------------------
// AgentChatService — streamAssistantReply (SSE-first path)
// ---------------------------------------------------------------------------

async function* fakeTurn() {
  yield { eventType: 'message_stream_started', payload: {} };
  yield { eventType: 'message_text_delta', payload: { delta: 'Ola ' } };
  yield { eventType: 'message_text_delta', payload: { delta: 'mundo' } };
  yield { eventType: 'message_completed', payload: { text: 'Ola mundo', citations: [] } };
}

class RecordingSink {
  chunks: string[] = [];
  ended = false;
  write(chunk: string) {
    this.chunks.push(chunk);
    return true;
  }
  end() {
    this.ended = true;
  }
}

describe('AgentChatService.streamAssistantReply', () => {
  const buildService = (overrides: { streamTurn?: () => AsyncGenerator<any> } = {}) => {
    const prisma = makeMockPrisma();
    prisma.agentChatThread.findUnique.mockResolvedValue({
      ...THREAD,
      agentId: 'agent-1',
      createdByUserId: 'user-1',
    });
    let createdCount = 0;
    prisma.agentChatMessage.create.mockImplementation(() => {
      createdCount += 1;
      return Promise.resolve({ id: createdCount === 1 ? 'user-msg' : 'assistant-msg' });
    });
    prisma.agentChatMessage.update.mockResolvedValue({ id: 'assistant-msg' });

    const orchestrator = {
      streamTurn: jest.fn(() => (overrides.streamTurn ?? fakeTurn)()),
    };
    const appendEvent = jest
      .fn()
      .mockImplementation((input: any) =>
        Promise.resolve({ event: { ...input, sequence: 1 }, projection: {} }),
      );
    const conversation = { appendEvent, getThreadReplay: jest.fn() };
    const sse = { writeEvent: jest.fn() };

    const service = new AgentChatService(
      prisma as any,
      makeMockIntentService() as any,
      makeMockRunsService() as any,
      orchestrator as any,
      makeMockSystemAgentsService() as any,
      conversation as any,
      sse as any,
    );
    return { service, prisma, orchestrator, conversation, sse };
  };

  it('persists the user message + assistant container and streams every event', async () => {
    const { service, prisma, conversation, sse } = buildService();
    const sink = new RecordingSink();

    await service.streamAssistantReply(
      'org-1',
      'user-1',
      { agentId: 'agent-1', threadId: 'thread-1', content: 'oi' },
      sink as any,
    );

    // user message + assistant container
    expect(prisma.agentChatMessage.create).toHaveBeenCalledTimes(2);
    // message_created + 4 streamed events all appended to the log
    const appendedTypes = conversation.appendEvent.mock.calls.map((c: any[]) => c[0].eventType);
    expect(appendedTypes).toEqual([
      'message_created',
      'message_stream_started',
      'message_text_delta',
      'message_text_delta',
      'message_completed',
    ]);
    // every appended event is written to the client
    expect(sse.writeEvent).toHaveBeenCalledTimes(5);
    // final assistant text persisted for durability + legacy listing
    expect(prisma.agentChatMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'assistant-msg' },
        data: expect.objectContaining({ content: 'Ola mundo' }),
      }),
    );
    expect(sink.ended).toBe(true);
  });

  it('rejects a thread that does not belong to the user', async () => {
    const { service, prisma } = buildService();
    prisma.agentChatThread.findUnique.mockResolvedValue({
      ...THREAD,
      agentId: 'agent-1',
      createdByUserId: 'someone-else',
    });
    const sink = new RecordingSink();

    await expect(
      service.streamAssistantReply(
        'org-1',
        'user-1',
        { agentId: 'agent-1', threadId: 'thread-1', content: 'oi' },
        sink as any,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('emits message_failed and still ends the stream when the turn throws', async () => {
    const { service, conversation, sse } = buildService({
      // biome-ignore lint/correctness/useYield: generator intentionally throws before yielding to simulate an orchestrator failure
      streamTurn: async function* () {
        throw new Error('orchestrator blew up');
      },
    });
    const sink = new RecordingSink();

    await service.streamAssistantReply(
      'org-1',
      'user-1',
      { agentId: 'agent-1', threadId: 'thread-1', content: 'oi' },
      sink as any,
    );

    const appendedTypes = conversation.appendEvent.mock.calls.map((c: any[]) => c[0].eventType);
    expect(appendedTypes).toContain('message_failed');
    expect(sink.ended).toBe(true);
    expect(sse.writeEvent).toHaveBeenCalled();
  });

  it('stops draining when the client aborts mid-stream', async () => {
    const { service, conversation } = buildService();
    const sink = new RecordingSink();
    let calls = 0;

    await service.streamAssistantReply(
      'org-1',
      'user-1',
      { agentId: 'agent-1', threadId: 'thread-1', content: 'oi' },
      sink as any,
      {
        isAborted: () => {
          calls += 1;
          return calls > 1; // abort after the first streamed event
        },
      },
    );

    // message_created + at most one streamed event before the abort takes effect
    expect(conversation.appendEvent.mock.calls.length).toBeLessThan(5);
  });
});

describe('AgentChatService.getThreadReplay', () => {
  it('merges persisted messages with their conversation projections', async () => {
    const prisma = makeMockPrisma();
    prisma.agentChatThread.findFirst.mockResolvedValue({
      id: 'thread-1',
      createdByUserId: 'user-1',
    });
    prisma.agentChatMessage.findMany.mockResolvedValue([
      {
        id: 'user-msg',
        role: 'user',
        content: 'pergunta',
        metadata: {},
        editedFromMessageId: null,
        regeneratedFromMessageId: null,
        createdAt: new Date(),
      },
      {
        id: 'assistant-msg',
        role: 'assistant',
        content: '',
        metadata: {},
        editedFromMessageId: null,
        regeneratedFromMessageId: null,
        createdAt: new Date(),
      },
    ]);
    const conversation = {
      appendEvent: jest.fn(),
      getThreadReplay: jest.fn().mockResolvedValue({
        threadId: 'thread-1',
        lastSequence: 7,
        messages: [
          {
            messageId: 'assistant-msg',
            status: 'completed',
            text: 'resposta final',
            citations: [{ label: 'Brain' }],
            isStreaming: false,
            isCompleted: true,
            isFailed: false,
            errorMessage: null,
            lastSequence: 7,
            toolCalls: [
              {
                toolCallId: 't1',
                toolName: 'rag_search',
                status: 'completed',
                groupId: 'tools',
                inputPayload: {},
                outputPayload: {},
                errorMessage: null,
                durationMs: 10,
                displayOrder: 0,
              },
            ],
          },
        ],
      }),
    };

    const service = new AgentChatService(
      prisma as any,
      makeMockIntentService() as any,
      makeMockRunsService() as any,
      makeMockOrchestratorService() as any,
      makeMockSystemAgentsService() as any,
      conversation as any,
      makeMockSse() as any,
    );

    const replay = await service.getThreadReplay('org-1', 'thread-1', 'user-1');

    expect(replay.lastSequence).toBe(7);
    const userMsg = replay.messages.find((m) => m.id === 'user-msg');
    const assistantMsg = replay.messages.find((m) => m.id === 'assistant-msg');
    expect(userMsg?.content).toBe('pergunta');
    expect(userMsg?.toolCalls).toEqual([]);
    expect(assistantMsg?.content).toBe('resposta final');
    expect(assistantMsg?.toolCalls).toHaveLength(1);
    expect(assistantMsg?.citations).toEqual([{ label: 'Brain' }]);
  });

  it('rejects replay for a thread the user does not own', async () => {
    const prisma = makeMockPrisma();
    prisma.agentChatThread.findFirst.mockResolvedValue({
      id: 'thread-1',
      createdByUserId: 'other',
    });
    const service = new AgentChatService(
      prisma as any,
      makeMockIntentService() as any,
      makeMockRunsService() as any,
      makeMockOrchestratorService() as any,
      makeMockSystemAgentsService() as any,
      makeMockConversationService() as any,
      makeMockSse() as any,
    );
    await expect(service.getThreadReplay('org-1', 'thread-1', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
