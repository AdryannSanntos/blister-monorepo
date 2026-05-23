import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AgentChatService } from './agent-chat.service';
import { AgentIntentService } from './agent-intent.service';
import { AgentRunsService } from './agent-runs.service';

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
  $transaction: jest.fn(),
});

const makeMockIntentService = () => ({
  classify: jest.fn().mockResolvedValue({ mode: 'execution', reason: 'task_requested' }),
});

const makeMockRunsService = () => ({
  createQueuedRun: jest.fn().mockResolvedValue({ id: 'run-1', status: 'queued' }),
});

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
      data: expect.objectContaining({ organizationId: 'org-1', agentId: 'agent-1', createdByUserId: 'user-1' }),
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

  beforeEach(async () => {
    prisma = makeMockPrisma();
    intentService = makeMockIntentService();
    runsService = makeMockRunsService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentChatService,
        { provide: PrismaService, useValue: prisma },
        { provide: AgentIntentService, useValue: intentService },
        { provide: AgentRunsService, useValue: runsService },
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
    intentService.classify.mockResolvedValue({ mode: 'conversational', reason: 'conversation_only' });

    const result = await service.createUserMessageAndProcess('org-1', 'user-1', {
      threadId: 'thread-1',
      content: 'Oi',
    });

    expect(runsService.createQueuedRun).not.toHaveBeenCalled();
    expect(result.run).toBeNull();
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
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentChatService,
        { provide: PrismaService, useValue: prisma },
        { provide: AgentIntentService, useValue: makeMockIntentService() },
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
    prisma.agentChatThread.findUnique.mockResolvedValue({ ...THREAD, createdByUserId: 'user-other' });

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
    prisma.agentChatMessage.create.mockResolvedValue({ id: 'copied-1' });

    await service.editMessageAndBranch(
      'org-1',
      { threadId: 'thread-1', messageId: 'msg-1', content: 'Nova' },
      'user-1',
    );

    // deve ter criado a mensagem copiada + a nova
    expect(prisma.agentChatMessage.create).toHaveBeenCalledTimes(2);
    expect(prisma.agentChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ content: 'Mensagem anterior', threadId: 'branch-1' }),
      }),
    );
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
        { provide: AgentRunsService, useValue: makeMockRunsService() },
      ],
    }).compile();
    service = module.get(AgentChatService);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns messages for thread owned by user', async () => {
    prisma.agentChatThread.findFirst.mockResolvedValue({ id: 'thread-1', createdByUserId: 'user-1' });
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
    prisma.agentChatThread.findFirst.mockResolvedValue({ id: 'thread-1', createdByUserId: 'user-other' });

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

    await expect(
      service.deleteThread('org-1', 'agent-1', 'thread-1', 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// AgentChatService — regenerateMessage
// ---------------------------------------------------------------------------

describe('AgentChatService.regenerateMessage', () => {
  let service: AgentChatService;
  let prisma: ReturnType<typeof makeMockPrisma>;
  let runsService: ReturnType<typeof makeMockRunsService>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    runsService = makeMockRunsService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentChatService,
        { provide: PrismaService, useValue: prisma },
        { provide: AgentIntentService, useValue: makeMockIntentService() },
        { provide: AgentRunsService, useValue: runsService },
      ],
    }).compile();
    service = module.get(AgentChatService);
  });

  afterEach(() => jest.clearAllMocks());

  it('creates a run to regenerate assistant message', async () => {
    const assistantMsg = { ...MESSAGE, id: 'asst-1', role: 'assistant', content: 'Resposta anterior' };
    prisma.agentChatMessage.findFirst.mockResolvedValue(assistantMsg);
    prisma.agentChatThread.findUnique.mockResolvedValue(THREAD);
    prisma.agentRun.findFirst.mockResolvedValue(null);
    prisma.agentChatMessage.create.mockResolvedValue({ id: 'regen-msg-1' });

    const result = await service.regenerateMessage(
      'org-1',
      { threadId: 'thread-1', messageId: 'asst-1' },
      'user-1',
    );

    expect(runsService.createQueuedRun).toHaveBeenCalledWith(
      'org-1',
      'agent-1',
      'user-1',
      expect.objectContaining({ input: expect.objectContaining({ regenerationOfMessageId: 'asst-1' }) }),
    );
    expect(result.run).not.toBeNull();
  });

  it('throws NotFoundException when message does not exist', async () => {
    prisma.agentChatMessage.findFirst.mockResolvedValue(null);

    await expect(
      service.regenerateMessage('org-1', { threadId: 'thread-1', messageId: 'ghost' }, 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when trying to regenerate a user message', async () => {
    prisma.agentChatMessage.findFirst.mockResolvedValue({ ...MESSAGE, role: 'user' });

    await expect(
      service.regenerateMessage('org-1', { threadId: 'thread-1', messageId: 'msg-1' }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when thread has no agentId', async () => {
    prisma.agentChatMessage.findFirst.mockResolvedValue({ ...MESSAGE, role: 'assistant' });
    prisma.agentChatThread.findUnique.mockResolvedValue({ ...THREAD, agentId: null });
    prisma.agentRun.findFirst.mockResolvedValue(null);

    await expect(
      service.regenerateMessage('org-1', { threadId: 'thread-1', messageId: 'msg-1' }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });
});
