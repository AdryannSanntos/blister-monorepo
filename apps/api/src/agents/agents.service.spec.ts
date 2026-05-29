import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AgentsService } from './agents.service';

const makeMockPrisma = () => ({
  agentTemplate: { findUnique: jest.fn() },
  companyAgent: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  agentVersion: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
});

describe('AgentsService', () => {
  let service: AgentsService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) =>
      callback(prisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AgentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates company agent from template', async () => {
    prisma.agentTemplate.findUnique.mockResolvedValue({
      id: 'template-1',
      defaultFlow: { nodes: [] },
      defaultInputSchema: { type: 'object' },
      defaultOutputSchema: { type: 'object' },
    });
    prisma.companyAgent.create.mockResolvedValue({ id: 'agent-1' });
    prisma.agentVersion.create.mockResolvedValue({ id: 'version-1' });

    await service.createCompanyAgent('org-1', 'user-1', {
      templateId: 'template-1',
      slug: 'analysis-agent',
      name: 'Analysis Agent',
      category: 'analysis',
    });

    expect(prisma.agentVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ flowDefinition: { nodes: [] }, versionNumber: 1 }),
    });
  });

  it('creates custom company agent', async () => {
    prisma.companyAgent.create.mockResolvedValue({ id: 'agent-1' });
    prisma.agentVersion.create.mockResolvedValue({ id: 'version-1' });

    await service.createCompanyAgent('org-1', 'user-1', {
      slug: 'custom-agent',
      name: 'Custom Agent',
      category: 'custom',
      flowDefinition: { nodes: [{ id: 'input' }] },
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
    });

    expect(prisma.companyAgent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ organizationId: 'org-1', slug: 'custom-agent' }),
    });
  });

  it('stores allowedTools on create', async () => {
    prisma.companyAgent.create.mockResolvedValue({
      id: 'agent-1',
      allowedTools: ['rag_search', 'file_search'],
    });
    prisma.agentVersion.create.mockResolvedValue({ id: 'version-1' });

    const result = await service.createCompanyAgent('org-1', 'user-1', {
      slug: 'research-agent',
      name: 'Research Agent',
      category: 'research',
      allowedTools: ['rag_search', 'file_search'],
    });

    expect(prisma.companyAgent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        allowedTools: ['rag_search', 'file_search'],
      }),
    });
    expect(result.allowedTools).toEqual(['rag_search', 'file_search']);
  });

  it('updates allowedTools', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({
      id: 'agent-1',
      organizationId: 'org-1',
      allowedTools: [],
    });
    prisma.companyAgent.update.mockResolvedValue({
      id: 'agent-1',
      allowedTools: ['web_research'],
    });

    const result = await service.updateCompanyAgent('org-1', 'agent-1', 'user-1', {
      allowedTools: ['web_research'],
    });

    expect(prisma.companyAgent.update).toHaveBeenCalledWith({
      where: { id: 'agent-1' },
      data: expect.objectContaining({
        allowedTools: ['web_research'],
        updatedByUserId: 'user-1',
      }),
    });
    expect(result.allowedTools).toEqual(['web_research']);
  });

  it('normalizes invalid allowedTools in getCompanyAgent', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({
      id: 'agent-1',
      organizationId: 'org-1',
      allowedTools: { bad: true },
      versions: [],
    });

    const result = await service.getCompanyAgent('org-1', 'agent-1');

    expect(result.allowedTools).toEqual([]);
  });

  it('normalizes invalid allowedTools in listCompanyAgents', async () => {
    prisma.companyAgent.findMany.mockResolvedValue([
      { id: 'agent-1', organizationId: 'org-1', allowedTools: 'bad', versions: [] },
    ]);

    const result = await service.listCompanyAgents('org-1');

    expect(result[0]?.allowedTools).toEqual([]);
  });

  it('saves draft version', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({ id: 'agent-1', organizationId: 'org-1' });
    prisma.agentVersion.findFirst.mockResolvedValueOnce({
      id: 'version-1',
      agentId: 'agent-1',
      status: 'draft',
      versionNumber: 1,
    });
    prisma.agentVersion.update.mockResolvedValue({ id: 'version-1', status: 'draft' });

    await service.saveDraftVersion('org-1', 'agent-1', 'user-1', {
      flowDefinition: { nodes: [], edges: [] },
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
    });

    expect(prisma.agentVersion.update).toHaveBeenCalled();
  });

  it('publishes draft version', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({ id: 'agent-1', organizationId: 'org-1' });
    prisma.agentVersion.findFirst.mockResolvedValue({
      id: 'version-1',
      agentId: 'agent-1',
      status: 'draft',
    });
    prisma.agentVersion.update.mockResolvedValue({ id: 'version-1', status: 'published' });

    const result = await service.publishVersion('org-1', 'agent-1', 'version-1', 'user-1');

    expect(result.status).toBe('published');
  });

  it('activates published version', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({ id: 'agent-1', organizationId: 'org-1' });
    prisma.agentVersion.findFirst.mockResolvedValue({
      id: 'version-1',
      agentId: 'agent-1',
      status: 'published',
    });
    prisma.companyAgent.update.mockResolvedValue({ id: 'agent-1', activeVersionId: 'version-1' });

    const result = await service.activateVersion('org-1', 'agent-1', 'version-1', 'user-1');

    expect(result.activeVersionId).toBe('version-1');
  });

  it('end-to-end: save draft → publish → activate marks agent active', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({
      id: 'agent-1',
      organizationId: 'org-1',
    });

    prisma.agentVersion.findFirst.mockResolvedValueOnce(null);
    prisma.agentVersion.findFirst.mockResolvedValueOnce(null);
    prisma.agentVersion.create.mockResolvedValue({
      id: 'v-1',
      agentId: 'agent-1',
      status: 'draft',
      versionNumber: 1,
    });

    const saved = await service.saveDraftVersion('org-1', 'agent-1', 'user-1', {
      flowDefinition: {
        config: { name: 'Test' },
        nodes: [
          { id: 'input', type: 'input' },
          { id: 'finalizer-1', type: 'finalizer' },
        ],
        edges: [
          {
            id: 'e1',
            sourceNodeId: 'input',
            sourcePortKey: 'payload',
            targetNodeId: 'finalizer-1',
            targetPortKey: 'default',
          },
        ],
      },
      inputSchema: {},
      outputSchema: {},
    });
    expect(saved.status).toBe('draft');

    prisma.agentVersion.findFirst.mockResolvedValueOnce({
      id: 'v-1',
      agentId: 'agent-1',
      status: 'draft',
    });
    prisma.agentVersion.update.mockResolvedValueOnce({
      id: 'v-1',
      status: 'published',
    });
    const published = await service.publishVersion('org-1', 'agent-1', 'v-1', 'user-1');
    expect(published.status).toBe('published');

    prisma.agentVersion.findFirst.mockResolvedValueOnce({
      id: 'v-1',
      agentId: 'agent-1',
      status: 'published',
    });
    prisma.companyAgent.update.mockResolvedValueOnce({
      id: 'agent-1',
      activeVersionId: 'v-1',
      status: 'active',
    });
    const activated = await service.activateVersion('org-1', 'agent-1', 'v-1', 'user-1');
    expect(activated.activeVersionId).toBe('v-1');
    expect(activated.status).toBe('active');
  });

  it('rejects activation of draft version', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({ id: 'agent-1', organizationId: 'org-1' });
    prisma.agentVersion.findFirst.mockResolvedValue({
      id: 'version-1',
      agentId: 'agent-1',
      status: 'draft',
    });

    await expect(
      service.activateVersion('org-1', 'agent-1', 'version-1', 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('lists agents scoped by organization', async () => {
    prisma.companyAgent.findMany.mockResolvedValue([{ id: 'agent-1', organizationId: 'org-1' }]);

    const result = await service.listCompanyAgents('org-1');

    expect(prisma.companyAgent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-1' } }),
    );
    expect(result).toHaveLength(1);
  });

  it('rejects cross-organization access', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue(null);

    await expect(service.getCompanyAgent('org-1', 'agent-1')).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when template does not exist', async () => {
    prisma.agentTemplate.findUnique.mockResolvedValue(null);

    await expect(
      service.createCompanyAgent('org-1', 'user-1', {
        templateId: 'nonexistent-template',
        slug: 'agent-x',
        name: 'Agent X',
        category: 'analysis',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when trying to set status to active via update', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({ id: 'agent-1', organizationId: 'org-1' });

    await expect(
      service.updateCompanyAgent('org-1', 'agent-1', 'user-1', { status: 'active' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when publishing a non-draft version', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({ id: 'agent-1', organizationId: 'org-1' });
    prisma.agentVersion.findFirst.mockResolvedValue({
      id: 'version-1',
      agentId: 'agent-1',
      status: 'published',
    });

    await expect(service.publishVersion('org-1', 'agent-1', 'version-1', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws NotFoundException when version does not belong to agent', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({ id: 'agent-1', organizationId: 'org-1' });
    prisma.agentVersion.findFirst.mockResolvedValue(null);

    await expect(
      service.publishVersion('org-1', 'agent-1', 'version-other-agent', 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates new draft version when no draft exists', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({ id: 'agent-1', organizationId: 'org-1' });
    // findFirst retorna null (sem draft) → findFirst novamente para o último version number
    prisma.agentVersion.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'version-1', versionNumber: 1 });
    prisma.agentVersion.create.mockResolvedValue({
      id: 'version-2',
      versionNumber: 2,
      status: 'draft',
    });

    await service.saveDraftVersion('org-1', 'agent-1', 'user-1', {
      flowDefinition: { nodes: [], edges: [] },
      inputSchema: {},
      outputSchema: {},
    });

    expect(prisma.agentVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ versionNumber: 2, status: 'draft' }),
      }),
    );
  });

  it('updates existing draft version when draft exists', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({ id: 'agent-1', organizationId: 'org-1' });
    prisma.agentVersion.findFirst.mockResolvedValue({
      id: 'draft-1',
      agentId: 'agent-1',
      status: 'draft',
      versionNumber: 2,
    });
    prisma.agentVersion.update.mockResolvedValue({ id: 'draft-1', status: 'draft' });

    await service.saveDraftVersion('org-1', 'agent-1', 'user-1', {
      flowDefinition: { nodes: [{ id: 'step1', type: 'input' }], edges: [] },
      inputSchema: {},
      outputSchema: {},
    });

    expect(prisma.agentVersion.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'draft-1' } }),
    );
    expect(prisma.agentVersion.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when updating agent from wrong org', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue(null);

    await expect(
      service.updateCompanyAgent('org-evil', 'agent-1', 'user-1', { name: 'Renamed' }),
    ).rejects.toThrow(NotFoundException);
  });
});
