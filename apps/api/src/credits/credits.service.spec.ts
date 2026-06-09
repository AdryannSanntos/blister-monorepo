import { Test, type TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreditService } from './credits.service';

const makeMockPrisma = () => {
  const creditBalance = {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  };
  const creditLedger = {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  };
  return {
    creditBalance,
    creditLedger,
    // Execute the callback with the same mocked client as the transaction client.
    $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
      cb({ creditBalance, creditLedger }),
    ),
  };
};

type MockPrisma = ReturnType<typeof makeMockPrisma>;

const makeMockAudit = () => ({ write: jest.fn().mockResolvedValue({}) });

describe('CreditService', () => {
  let service: CreditService;
  let prisma: MockPrisma;
  let audit: ReturnType<typeof makeMockAudit>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    audit = makeMockAudit();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<CreditService>(CreditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('debit', () => {
    it('reduces balance and writes a DEBIT ledger row with correct balanceAfter', async () => {
      prisma.creditBalance.findUniqueOrThrow.mockResolvedValue({
        companyId: 'company-1',
        amount: '20',
        currency: 'USD',
      });
      prisma.creditLedger.create.mockResolvedValue({ id: 'ledger-1' });

      await service.debit('company-1', 5, 'agent run');

      expect(prisma.creditBalance.update).toHaveBeenCalledWith({
        where: { companyId: 'company-1' },
        data: { amount: 15 },
      });
      const ledgerArg = prisma.creditLedger.create.mock.calls[0][0];
      expect(ledgerArg.data).toEqual(
        expect.objectContaining({
          companyId: 'company-1',
          type: 'DEBIT',
          amount: 5,
          balanceAfter: 15,
          currency: 'USD',
          description: 'agent run',
        }),
      );
    });

    it('throws when balance is insufficient', async () => {
      prisma.creditBalance.findUniqueOrThrow.mockResolvedValue({
        companyId: 'company-1',
        amount: '3',
        currency: 'USD',
      });

      await expect(service.debit('company-1', 5)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(prisma.creditBalance.update).not.toHaveBeenCalled();
      expect(prisma.creditLedger.create).not.toHaveBeenCalled();
    });
  });

  describe('adjust', () => {
    it('clamps balance at 0 for a DEBIT adjustment and writes an audit entry', async () => {
      prisma.creditBalance.findUniqueOrThrow.mockResolvedValue({
        companyId: 'company-1',
        amount: '2',
        currency: 'USD',
      });
      prisma.creditLedger.create.mockResolvedValue({ id: 'ledger-1' });

      await service.adjust('company-1', 5, 'DEBIT', 'admin-1', 'manual fix');

      expect(prisma.creditBalance.update).toHaveBeenCalledWith({
        where: { companyId: 'company-1' },
        data: { amount: 0 },
      });
      const ledgerArg = prisma.creditLedger.create.mock.calls[0][0];
      expect(ledgerArg.data).toEqual(
        expect.objectContaining({
          type: 'DEBIT',
          amount: 5,
          balanceAfter: 0,
          description: 'manual fix',
          createdByUserId: 'admin-1',
        }),
      );
      expect(audit.write).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'admin-1',
          action: 'credit.adjust',
          resourceType: 'CreditBalance',
          resourceId: 'company-1',
          metadata: { amount: 5, type: 'DEBIT', reason: 'manual fix' },
        }),
      );
    });
  });
});
