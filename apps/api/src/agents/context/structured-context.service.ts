import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContextPolicyService } from './context-policy.service';

type LoadStructuredContextInput = {
  organizationId: string;
  permissions: string[];
  agentId?: string;
  userId?: string;
};

@Injectable()
export class StructuredContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contextPolicyService: ContextPolicyService,
  ) {}

  async loadContext(input: LoadStructuredContextInput) {
    const [
      brain,
      contextSources,
      contextArtifact,
      assets,
      designSystem,
      agents,
      runs,
      members,
      creditEntries,
    ] = await Promise.all([
      this.prisma.onboardingDraft.findUnique({
        where: { organizationId: input.organizationId },
      }),
      this.prisma.contextSource.findMany({
        where: {
          organizationId: input.organizationId,
          pipelineStatus: 'approved',
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      this.prisma.contextArtifact.findUnique({
        where: { organizationId: input.organizationId },
      }),
      this.prisma.asset.findMany({
        where: {
          organizationId: input.organizationId,
          contextRole: true,
        },
        include: { relations: true },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      this.prisma.designSystemProfile.findUnique({
        where: { organizationId: input.organizationId },
        include: {
          colorGroups: {
            include: { colors: { orderBy: { sortOrder: 'asc' } } },
            orderBy: { sortOrder: 'asc' },
          },
          assets: {
            orderBy: { updatedAt: 'desc' },
          },
        },
      }),
      this.prisma.companyAgent.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.agentId ? { id: input.agentId } : {}),
        },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          status: true,
          activeVersionId: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: input.agentId ? 1 : 10,
      }),
      this.prisma.agentRun.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.agentId ? { agentId: input.agentId } : {}),
          ...(input.userId ? { createdByUserId: input.userId } : {}),
        },
        include: {
          agent: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
          steps: {
            select: {
              id: true,
              blockKey: true,
              blockType: true,
              status: true,
              startedAt: true,
              completedAt: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
            take: 10,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.membership.findMany({
        where: { organizationId: input.organizationId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          roles: {
            include: { role: true },
          },
        },
        take: 20,
      }),
      this.prisma.creditLedgerEntry.findMany({
        where: { organizationId: input.organizationId },
        select: {
          amount: true,
          entryType: true,
          createdAt: true,
          runId: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const creditBalance = creditEntries.reduce((total, entry) => total + entry.amount, 0);

    const runSummaries = runs.map((run) => ({
      id: run.id,
      status: run.status,
      errorMessage: run.errorMessage,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
      agent: run.agent,
      steps: run.steps,
    }));

    const integrationMetadata = {
      status: 'not_implemented',
      items: [],
    };

    return this.contextPolicyService.filterStructuredContextByPermissions(
      {
        brain,
        contextSources,
        contextArtifact,
        assets,
        designSystem,
        agents,
        runs: runSummaries,
        members,
        credits: {
          balance: creditBalance,
          recentEntries: creditEntries,
        },
        integrations: integrationMetadata,
      },
      input.permissions,
    );
  }
}
