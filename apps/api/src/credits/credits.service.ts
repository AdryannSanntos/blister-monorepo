import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CreditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getBalance(companyId: string) {
    const balance = await this.prisma.creditBalance.findUnique({
      where: { companyId },
    });
    if (!balance) throw new NotFoundException('Credit balance not found');
    return balance;
  }

  async checkBalance(companyId: string, estimatedCost: number) {
    const balance = await this.getBalance(companyId);
    if (Number(balance.amount) < estimatedCost) {
      throw new UnprocessableEntityException('Insufficient credit balance');
    }
  }

  async getSummary(companyId: string) {
    const [balance, ledger] = await Promise.all([
      this.getBalance(companyId),
      this.prisma.creditLedger.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    return { balance, ledger };
  }

  async getPersonalBalance(personalSpaceId: string) {
    const existing = await this.prisma.personalCreditBalance.findUnique({
      where: { personalSpaceId },
    });
    if (existing) return existing;

    const settings = await this.prisma.platformCreditSettings.findUnique({
      where: { id: 'default' },
    });

    return this.prisma.personalCreditBalance.create({
      data: {
        personalSpaceId,
        amount: settings?.freeTierAmount ?? 20,
        currency: 'USD',
      },
    });
  }

  async getPersonalSummary(personalSpaceId: string) {
    const balance = await this.getPersonalBalance(personalSpaceId);
    const ledger = await this.prisma.personalCreditLedger.findMany({
      where: { personalSpaceId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return {
      balance: {
        id: balance.id,
        companyId: balance.personalSpaceId,
        amount: balance.amount.toString(),
        currency: balance.currency,
        updatedAt: balance.updatedAt.toISOString(),
      },
      ledger,
    };
  }

  async getPersonalHistory(personalSpaceId: string, page: number, pageSize: number) {
    await this.getPersonalBalance(personalSpaceId);
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.personalCreditLedger.findMany({
        where: { personalSpaceId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.personalCreditLedger.count({ where: { personalSpaceId } }),
    ]);
    return { items, total, page, pageSize };
  }

  /**
   * Spend grouped by agent over the last `days` window (DEBIT entries linked to
   * an agent run). Works for both company and personal workspaces. Sorted by
   * total spent, descending. Amounts are serialized as strings (USD = credits).
   */
  async getAgentSpend(
    workspace:
      | { type: 'company'; companyId: string }
      | { type: 'personal'; personalSpaceId: string },
    days = 30,
  ) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows =
      workspace.type === 'company'
        ? await this.prisma.creditLedger.findMany({
            where: {
              companyId: workspace.companyId,
              type: 'DEBIT',
              createdAt: { gte: since },
              agentRunId: { not: null },
            },
            select: { amount: true, agentRunId: true, agentRun: { select: { agentId: true } } },
          })
        : await this.prisma.personalCreditLedger.findMany({
            where: {
              personalSpaceId: workspace.personalSpaceId,
              type: 'DEBIT',
              createdAt: { gte: since },
              agentRunId: { not: null },
            },
            select: { amount: true, agentRunId: true, agentRun: { select: { agentId: true } } },
          });

    const byAgent = new Map<string, { total: number; runs: Set<string> }>();
    for (const row of rows) {
      const agentId = row.agentRun?.agentId;
      if (!agentId) continue;
      const entry = byAgent.get(agentId) ?? { total: 0, runs: new Set<string>() };
      entry.total += Number(row.amount);
      if (row.agentRunId) entry.runs.add(row.agentRunId);
      byAgent.set(agentId, entry);
    }

    return {
      windowDays: days,
      items: Array.from(byAgent.entries())
        .map(([agentId, { total, runs }]) => ({
          agentId,
          totalSpent: total.toFixed(4),
          runs: runs.size,
        }))
        .sort((a, b) => Number(b.totalSpent) - Number(a.totalSpent)),
    };
  }

  async getHistory(companyId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.creditLedger.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.creditLedger.count({ where: { companyId } }),
    ]);
    return { items, total, page, pageSize };
  }

  async debit(
    companyId: string,
    amount: number,
    description?: string,
    agentRunStepId?: string,
    agentRunId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.findUniqueOrThrow({
        where: { companyId },
      });
      const newAmount = Number(balance.amount) - amount;
      if (newAmount < 0) {
        throw new UnprocessableEntityException('Insufficient credit balance');
      }
      await tx.creditBalance.update({
        where: { companyId },
        data: { amount: newAmount },
      });
      return tx.creditLedger.create({
        data: {
          companyId,
          type: 'DEBIT',
          amount,
          balanceAfter: newAmount,
          currency: balance.currency,
          description,
          agentRunStepId,
          agentRunId,
        },
      });
    });
  }

  async credit(companyId: string, amount: number, description?: string) {
    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.findUniqueOrThrow({
        where: { companyId },
      });
      const newAmount = Number(balance.amount) + amount;
      await tx.creditBalance.update({
        where: { companyId },
        data: { amount: newAmount },
      });
      return tx.creditLedger.create({
        data: {
          companyId,
          type: 'CREDIT',
          amount,
          balanceAfter: newAmount,
          currency: balance.currency,
          description,
        },
      });
    });
  }

  async adjust(
    companyId: string,
    amount: number,
    type: 'CREDIT' | 'DEBIT' | 'ADJUST',
    adminUserId: string,
    reason: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.findUniqueOrThrow({
        where: { companyId },
      });
      const delta = type === 'DEBIT' ? -amount : amount;
      const newAmount = Math.max(0, Number(balance.amount) + delta);
      await tx.creditBalance.update({
        where: { companyId },
        data: { amount: newAmount },
      });
      return tx.creditLedger.create({
        data: {
          companyId,
          type,
          amount,
          balanceAfter: newAmount,
          currency: balance.currency,
          description: reason,
          createdByUserId: adminUserId,
        },
      });
    });
    await this.audit.write({
      actorUserId: adminUserId,
      action: 'credit.adjust',
      resourceType: 'CreditBalance',
      resourceId: companyId,
      metadata: { amount, type, reason },
    });
    return result;
  }
}
