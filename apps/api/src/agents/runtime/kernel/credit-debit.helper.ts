import { Prisma, type PrismaClient } from '../../../generated/prisma';
import type { CreditDebitResult, PlatformSettings } from './types';

export async function getPlatformSettings(prisma: PrismaClient): Promise<PlatformSettings> {
  const settings = await prisma.platformCreditSettings.findUnique({
    where: { id: 'default' },
  });

  return {
    markupDefault: settings?.markupDefault ? Number(settings.markupDefault) : 1.2,
    minRunCost: settings?.minRunCost ? Number(settings.minRunCost) : 0.01,
  };
}

export async function checkBalance(
  prisma: PrismaClient,
  companyId: string,
  estimatedCost: number,
  settings: PlatformSettings,
): Promise<{ sufficient: boolean; currentBalance: number; requiredBalance: number }> {
  const balance = await prisma.creditBalance.findUnique({
    where: { companyId },
  });

  const currentBalance = balance ? Number(balance.amount) : 0;
  const effectiveCost = Math.max(estimatedCost * settings.markupDefault, settings.minRunCost);

  return {
    sufficient: currentBalance >= effectiveCost,
    currentBalance,
    requiredBalance: effectiveCost,
  };
}

export async function debitStepCredits(
  prisma: PrismaClient,
  params: {
    companyId: string;
    agentRunId: string;
    agentRunStepId: string;
    stepKey: string;
    baseCost: number;
    markupMultiplier: number;
  },
): Promise<CreditDebitResult> {
  const debitAmount = params.baseCost * params.markupMultiplier;

  if (debitAmount <= 0) {
    return {
      success: true,
      debitedAmount: 0,
      newBalance: 0,
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.findUnique({
        where: { companyId: params.companyId },
      });

      if (!balance) {
        throw new Error('Credit balance not found');
      }

      const currentBalance = Number(balance.amount);
      if (currentBalance < debitAmount) {
        throw new Error('Insufficient credit balance');
      }

      const newBalance = currentBalance - debitAmount;

      await tx.creditBalance.update({
        where: { companyId: params.companyId },
        data: { amount: new Prisma.Decimal(newBalance) },
      });

      const ledgerEntry = await tx.creditLedger.create({
        data: {
          companyId: params.companyId,
          type: 'DEBIT',
          amount: new Prisma.Decimal(debitAmount),
          balanceAfter: new Prisma.Decimal(newBalance),
          description: `Agent run step: ${params.stepKey}`,
          agentRunId: params.agentRunId,
          agentRunStepId: params.agentRunStepId,
        },
      });

      return { newBalance, ledgerEntryId: ledgerEntry.id };
    });

    return {
      success: true,
      debitedAmount: debitAmount,
      newBalance: result.newBalance,
      ledgerEntryId: result.ledgerEntryId,
    };
  } catch (error) {
    return {
      success: false,
      debitedAmount: 0,
      newBalance: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function calculateStepCost(
  tokensInput: number,
  tokensOutput: number,
  inputCostPer1k: number,
  outputCostPer1k: number,
): number {
  const inputCost = (tokensInput / 1000) * inputCostPer1k;
  const outputCost = (tokensOutput / 1000) * outputCostPer1k;
  return inputCost + outputCost;
}
