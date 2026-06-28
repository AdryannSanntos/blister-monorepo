import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACTIVE_COMPANY_COOKIE,
  getActiveCompanyIdFromRequest,
} from '../company/company-context.util';
import { ensureWorkspaceAgentFolders } from '../files/workspace-folders.util';

export type WorkspaceScope = { type: 'company'; companyId: string };

export type ResolvedWorkspace = WorkspaceScope & {
  userId: string;
};

@Injectable()
export class WorkspaceContextService {
  constructor(private readonly prisma: PrismaService) {}

  getActiveWorkspaceIdFromRequest(req: Request): string | undefined {
    return getActiveCompanyIdFromRequest(req);
  }

  async resolveFromRequest(userId: string, req: Request): Promise<ResolvedWorkspace> {
    const activeId = this.getActiveWorkspaceIdFromRequest(req);

    if (!activeId) {
      throw new BadRequestException('Nenhuma empresa ativa selecionada. Selecione uma empresa para continuar.');
    }

    await this.assertCompanyAccess(userId, activeId);
    return { type: 'company', companyId: activeId, userId };
  }

  async assertCompanyAccess(userId: string, companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { members: { where: { userId } } },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const isOwner = company.ownerUserId === userId;
    const isMember = company.members.length > 0;

    if (!isOwner && !isMember) {
      throw new ForbiddenException('You do not have access to this company');
    }

    if (!company.onboardingCompletedAt) {
      throw new BadRequestException('Company onboarding is incomplete');
    }

    return company;
  }

  async listAccessibleWorkspaces(userId: string) {
    const ownedCompanies = await this.prisma.company.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: 'asc' },
    });

    const memberCompanies = await this.prisma.companyMember.findMany({
      where: { userId },
      include: { company: true },
    });

    const companyMap = new Map<string, (typeof ownedCompanies)[number]>();
    for (const company of ownedCompanies) {
      companyMap.set(company.id, company);
    }
    for (const membership of memberCompanies) {
      companyMap.set(membership.company.id, membership.company);
    }

    return {
      companies: [...companyMap.values()],
    };
  }

  async ensureCompanyAgentFolders(companyId: string) {
    await ensureWorkspaceAgentFolders(this.prisma, { companyId });
  }

  async ensureCompanyWorkspaceSettings(companyId: string, displayName?: string) {
    const existing = await this.prisma.workspaceSettings.findUnique({
      where: { companyId },
    });
    if (existing) return existing;

    return this.prisma.workspaceSettings.create({
      data: {
        companyId,
        displayName: displayName ?? null,
      },
    });
  }

  static activeWorkspaceCookie = ACTIVE_COMPANY_COOKIE;
}
