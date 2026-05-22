import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import type { AddCreditsDto } from './dto';

const toJsonValue = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

type RecordTechnicalCostInput = {
  organizationId?: string;
  runId?: string;
  idempotencyKey?: string;
  providerId?: string;
  modelId?: string;
  amount: number;
  currency?: string;
  unit?: string;
  metadata?: Record<string, unknown>;
};

type PlatformCostSummaryFilters = {
  providerId?: string;
  modelId?: string;
  organizationId?: string;
  dateFrom?: string;
  dateTo?: string;
  minCost?: number;
  maxCost?: number;
  groupBy?: 'provider' | 'model';
};

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganizationBalance(organizationId: string) {
    const entries = await this.prisma.creditLedgerEntry.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });

    const balance = entries.reduce((total, entry) => total + entry.amount, 0);
    return { organizationId, balance };
  }

  async listOrganizationLedger(organizationId: string) {
    return this.prisma.creditLedgerEntry.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addCredits(actorUserId: string, organizationId: string, input: AddCreditsDto) {
    const { balance } = await this.getOrganizationBalance(organizationId);
    return this.prisma.creditLedgerEntry.create({
      data: {
        organizationId,
        entryType: 'credit_added',
        amount: input.amount,
        balanceAfter: balance + input.amount,
        metadata: toJsonValue({ reason: input.reason ?? null }),
        createdByUserId: actorUserId,
      },
    });
  }

  async debitRunCredits(
    runId: string,
    amount: number,
    options: { strict?: boolean; idempotencyKey?: string } = {},
  ) {
    const run = await this.prisma.agentRun.findUnique({ where: { id: runId } });
    if (!run) {
      throw new NotFoundException('Agent run not found');
    }

    if (options.idempotencyKey) {
      const existingEntry = await this.prisma.creditLedgerEntry.findUnique({
        where: { idempotencyKey: options.idempotencyKey },
      });

      if (existingEntry) {
        return existingEntry;
      }
    }

    const { balance } = await this.getOrganizationBalance(run.organizationId);
    if (options.strict && balance < amount) {
      throw new BadRequestException('Insufficient credit balance');
    }

    return this.prisma.creditLedgerEntry.create({
      data: {
        organizationId: run.organizationId,
        runId,
        idempotencyKey: options.idempotencyKey,
        entryType: 'run_debit',
        amount: -amount,
        balanceAfter: balance - amount,
        metadata: toJsonValue({ strict: options.strict === true }),
      },
    });
  }

  async recordTechnicalCost(input: RecordTechnicalCostInput) {
    if (input.idempotencyKey) {
      const existingEntry = await this.prisma.technicalCostLedgerEntry.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });

      if (existingEntry) {
        return existingEntry;
      }
    }

    return this.prisma.technicalCostLedgerEntry.create({
      data: {
        organizationId: input.organizationId ?? null,
        runId: input.runId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        providerId: input.providerId ?? null,
        modelId: input.modelId ?? null,
        amount: input.amount,
        currency: input.currency ?? 'USD',
        unit: input.unit ?? 'estimated',
        metadata: toJsonValue(input.metadata ?? {}),
      },
    });
  }

  async getPlatformCostSummary(filters: PlatformCostSummaryFilters = {}) {
    const entries = await this.prisma.technicalCostLedgerEntry.findMany({
      where: {
        ...(filters.providerId ? { providerId: filters.providerId } : {}),
        ...(filters.modelId ? { modelId: filters.modelId } : {}),
        ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
        ...(filters.dateFrom || filters.dateTo
          ? {
              createdAt: {
                ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
                ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const filteredEntries = entries.filter((entry) => {
      if (filters.minCost !== undefined && entry.amount < filters.minCost) {
        return false;
      }
      if (filters.maxCost !== undefined && entry.amount > filters.maxCost) {
        return false;
      }
      return true;
    });

    const totalCost = filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);
    if (!filters.groupBy) {
      return { totalCost, entries: filteredEntries };
    }

    const grouped = new Map<string, number>();
    for (const entry of filteredEntries) {
      const key =
        filters.groupBy === 'provider'
          ? (entry.providerId ?? 'unknown')
          : (entry.modelId ?? 'unknown');
      grouped.set(key, (grouped.get(key) ?? 0) + entry.amount);
    }

    return {
      totalCost,
      breakdown: Array.from(grouped.entries()).map(([key, amount]) => ({ key, amount })),
    };
  }
}
