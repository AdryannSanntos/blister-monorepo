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
