import type { PrismaClient } from '@company-os/db';

export interface CreditSnapshot {
  balance: number;
  ledgerCount: number;
  totalDebits: number;
  totalCredits: number;
}

export async function getCreditSnapshot(
  prisma: PrismaClient,
  companyId: string,
): Promise<CreditSnapshot> {
  const [balance, ledger] = await Promise.all([
    prisma.creditBalance.findUnique({ where: { companyId } }),
    prisma.creditLedger.findMany({ where: { companyId } }),
  ]);

  const totalDebits = ledger
    .filter((l) => l.type === 'DEBIT')
    .reduce((sum, l) => sum + Number(l.amount), 0);

  const totalCredits = ledger
    .filter((l) => l.type === 'CREDIT')
    .reduce((sum, l) => sum + Number(l.amount), 0);

  return {
    balance: balance ? Number(balance.amount) : 0,
    ledgerCount: ledger.length,
    totalDebits,
    totalCredits,
  };
}

export interface CreditAssertion {
  expectedBalanceChange?: number;
  expectedDebitCount?: number;
  expectedDebitSum?: number;
  agentRunId?: string;
}

export async function assertCreditLedger(
  prisma: PrismaClient,
  companyId: string,
  before: CreditSnapshot,
  assertion: CreditAssertion,
): Promise<void> {
  const after = await getCreditSnapshot(prisma, companyId);

  if (assertion.expectedBalanceChange !== undefined) {
    const actualChange = before.balance - after.balance;
    const tolerance = 0.0001;
    if (Math.abs(actualChange - assertion.expectedBalanceChange) > tolerance) {
      throw new Error(
        `Balance change mismatch: expected ${assertion.expectedBalanceChange}, got ${actualChange}`,
      );
    }
  }

  if (assertion.expectedDebitCount !== undefined) {
    const newDebits = after.ledgerCount - before.ledgerCount;
    const debitEntries = await prisma.creditLedger.findMany({
      where: { companyId, type: 'DEBIT' },
      orderBy: { createdAt: 'desc' },
      take: newDebits,
    });

    const actualDebitCount = debitEntries.length;
    if (actualDebitCount !== assertion.expectedDebitCount) {
      throw new Error(
        `Debit count mismatch: expected ${assertion.expectedDebitCount}, got ${actualDebitCount}`,
      );
    }
  }

  if (assertion.agentRunId) {
    const runDebits = await prisma.creditLedger.findMany({
      where: { companyId, type: 'DEBIT', agentRunId: assertion.agentRunId },
    });

    if (runDebits.length === 0) {
      throw new Error(
        `No debit entries found for agent run: ${assertion.agentRunId}`,
      );
    }

    const hasStepRefs = runDebits.every((d) => d.agentRunStepId !== null);
    if (!hasStepRefs) {
      throw new Error(
        'Some debit entries are missing agentRunStepId references',
      );
    }

    if (assertion.expectedDebitSum !== undefined) {
      const actualSum = runDebits.reduce((sum, d) => sum + Number(d.amount), 0);
      const tolerance = 0.0001;
      if (Math.abs(actualSum - assertion.expectedDebitSum) > tolerance) {
        throw new Error(
          `Debit sum mismatch for run ${assertion.agentRunId}: expected ${assertion.expectedDebitSum}, got ${actualSum}`,
        );
      }
    }
  }
}

export async function assertNoOrphanDebits(
  prisma: PrismaClient,
  companyId: string,
): Promise<void> {
  const orphanDebits = await prisma.creditLedger.findMany({
    where: {
      companyId,
      type: 'DEBIT',
      agentRunId: null,
    },
  });

  if (orphanDebits.length > 0) {
    throw new Error(
      `Found ${orphanDebits.length} orphan debit entries without agentRunId`,
    );
  }
}
