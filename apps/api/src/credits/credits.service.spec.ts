import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CreditsService } from './credits.service';

const makeMockPrisma = () => ({
  creditLedgerEntry: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  technicalCostLedgerEntry: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  agentRun: {
    findUnique: jest.fn(),
  },
});

describe('CreditsService', () => {
  let service: CreditsService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CreditsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CreditsService);
  });

  it('adds credits to organization', async () => {
    prisma.creditLedgerEntry.findMany.mockResolvedValue([]);
    prisma.creditLedgerEntry.create.mockResolvedValue({ id: 'entry-1', amount: 100 });

    const result = await service.addCredits('actor-1', 'org-1', { amount: 100 });

    expect(prisma.creditLedgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ organizationId: 'org-1', entryType: 'credit_added', amount: 100 }),
    });
    expect(result.amount).toBe(100);
  });

  it('debits credits for run', async () => {
    prisma.agentRun.findUnique.mockResolvedValue({ id: 'run-1', organizationId: 'org-1' });
    prisma.creditLedgerEntry.findMany.mockResolvedValue([{ amount: 200 }]);
    prisma.creditLedgerEntry.create.mockResolvedValue({ id: 'entry-1', amount: -40 });

    const result = await service.debitRunCredits('run-1', 40);

    expect(result.amount).toBe(-40);
  });

  it('rejects debit when insufficient balance if strict mode is enabled', async () => {
    prisma.agentRun.findUnique.mockResolvedValue({ id: 'run-1', organizationId: 'org-1' });
    prisma.creditLedgerEntry.findMany.mockResolvedValue([{ amount: 10 }]);

    await expect(service.debitRunCredits('run-1', 40, { strict: true })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('records technical cost separately from credits', async () => {
    prisma.technicalCostLedgerEntry.create.mockResolvedValue({ id: 'cost-1', amount: 1.25 });

    const result = await service.recordTechnicalCost({
      organizationId: 'org-1',
      runId: 'run-1',
      providerId: 'provider-1',
      modelId: 'model-1',
      amount: 1.25,
    });

    expect(result.id).toBe('cost-1');
    expect(prisma.creditLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('global platform cost report includes provider/model breakdown', async () => {
    prisma.technicalCostLedgerEntry.findMany.mockResolvedValue([
      { providerId: 'provider-1', modelId: 'model-1', amount: 1.5 },
      { providerId: 'provider-1', modelId: 'model-2', amount: 2 },
      { providerId: 'provider-2', modelId: 'model-3', amount: 3 },
    ]);

    const providerSummary = await service.getPlatformCostSummary({ groupBy: 'provider' });
    const modelSummary = await service.getPlatformCostSummary({ groupBy: 'model' });

    expect(providerSummary.totalCost).toBe(6.5);
    expect(providerSummary.breakdown).toEqual(
      expect.arrayContaining([{ key: 'provider-1', amount: 3.5 }, { key: 'provider-2', amount: 3 }]),
    );
    expect(modelSummary.breakdown).toEqual(
      expect.arrayContaining([{ key: 'model-1', amount: 1.5 }, { key: 'model-2', amount: 2 }]),
    );
  });

  it('throws when debiting a missing run', async () => {
    prisma.agentRun.findUnique.mockResolvedValue(null);

    await expect(service.debitRunCredits('run-404', 10)).rejects.toThrow(NotFoundException);
  });
});
