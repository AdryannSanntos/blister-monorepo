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
      flowDefinition: { nodes: [] },
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

  it('rejects activation of draft version', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({ id: 'agent-1', organizationId: 'org-1' });
    prisma.agentVersion.findFirst.mockResolvedValue({
      id: 'version-1',
      agentId: 'agent-1',
      status: 'draft',
    });

    await expect(service.activateVersion('org-1', 'agent-1', 'version-1', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
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
});
