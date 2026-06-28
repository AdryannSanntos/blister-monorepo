import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import type { UpdateAgentWorkspaceSettingsDto, UpdateWorkspaceSettingsDto, WorkspaceProfile } from '@company-os/types';
import { cutsAgentSettingsSchema } from '@company-os/types';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceContextService } from '../workspace/workspace-context.service';
import { MarketplaceService } from '../marketplace/marketplace.service';

const serializeSettings = (settings: {
  displayName: string | null;
  niche: string | null;
  audience: string | null;
  voice: string | null;
  positioning: string | null;
  contentPreferences: string | null;
  logoStorageKey: string | null;
  palette: unknown;
  timezone: string | null;
}): WorkspaceProfile => ({
  displayName: settings.displayName ?? undefined,
  niche: settings.niche ?? undefined,
  audience: settings.audience ?? undefined,
  voice: settings.voice ?? undefined,
  positioning: settings.positioning ?? undefined,
  contentPreferences: settings.contentPreferences ?? undefined,
  logoStorageKey: settings.logoStorageKey ?? undefined,
  palette: Array.isArray(settings.palette) ? (settings.palette as string[]) : [],
  timezone: settings.timezone ?? undefined,
});

@Injectable()
export class WorkspaceSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly marketplace: MarketplaceService,
  ) {}

  async getPersonalSettings(_userId: string) {
    throw new NotFoundException('Personal Space no longer supported');
  }

  async updatePersonalSettings(_userId: string, _dto: UpdateWorkspaceSettingsDto) {
    throw new NotFoundException('Personal Space no longer supported');
  }

  async getCompanySettings(userId: string, req: Request) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    if (workspace.type !== 'company') {
      throw new NotFoundException('Active workspace is not a company');
    }

    await this.workspaceContext.ensureCompanyWorkspaceSettings(workspace.companyId);
    const settings = await this.prisma.workspaceSettings.findUnique({
      where: { companyId: workspace.companyId },
    });
    if (!settings) throw new NotFoundException('Workspace settings not found');
    return serializeSettings(settings);
  }

  async updateCompanySettings(
    userId: string,
    req: Request,
    dto: UpdateWorkspaceSettingsDto,
  ) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    if (workspace.type !== 'company') {
      throw new NotFoundException('Active workspace is not a company');
    }

    await this.workspaceContext.ensureCompanyWorkspaceSettings(workspace.companyId);
    const updated = await this.prisma.workspaceSettings.update({
      where: { companyId: workspace.companyId },
      data: {
        displayName: dto.displayName,
        niche: dto.niche,
        audience: dto.audience,
        voice: dto.voice,
        positioning: dto.positioning,
        contentPreferences: dto.contentPreferences,
        logoStorageKey: dto.logoStorageKey,
        palette: dto.palette,
        timezone: dto.timezone,
      },
    });
    return serializeSettings(updated);
  }

  async getActiveSettings(userId: string, req: Request) {
    return this.getCompanySettings(userId, req);
  }

  async updateActiveSettings(userId: string, req: Request, dto: UpdateWorkspaceSettingsDto) {
    return this.updateCompanySettings(userId, req, dto);
  }

  async getAgentSettings(userId: string, req: Request, agentId: string) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const where = { companyId: workspace.companyId, agentId };

    const existing = await this.prisma.agentWorkspaceSetting.findFirst({ where });
    const config = cutsAgentSettingsSchema.parse(existing?.config ?? {});

    return { agentId, config };
  }

  async updateAgentSettings(
    userId: string,
    req: Request,
    agentId: string,
    dto: UpdateAgentWorkspaceSettingsDto,
  ) {
    if (agentId !== 'cuts') {
      throw new NotFoundException('Agent settings not supported');
    }

    const parsedConfig = cutsAgentSettingsSchema.parse(dto.config);

    if (parsedConfig.addCaptions && parsedConfig.captionStyleId) {
      await this.assertOwnsTextStyle(userId, req, parsedConfig.captionStyleId);
    }

    if (parsedConfig.addTitle && parsedConfig.titleStyleId) {
      await this.assertOwnsTextStyle(userId, req, parsedConfig.titleStyleId);
    }

    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);

    const saved = await this.prisma.agentWorkspaceSetting.upsert({
      where: {
        companyId_agentId: {
          companyId: workspace.companyId,
          agentId,
        },
      },
      create: {
        companyId: workspace.companyId,
        agentId,
        config: parsedConfig,
      },
      update: { config: parsedConfig },
    });

    return { agentId, config: cutsAgentSettingsSchema.parse(saved.config) };
  }

  /** Cuts overlay styles are TEXT_STYLE marketplace items (Remotion specs). */
  private async assertOwnsTextStyle(
    userId: string,
    req: Request,
    styleId: string,
  ) {
    const entitlements = await this.marketplace.getEntitlements(userId, req, 'text-style');
    const ownsStyle = entitlements.some(
      (item) => item.id === styleId || item.slug === styleId,
    );
    if (!ownsStyle) {
      throw new BadRequestException('Text style is not owned by this workspace');
    }
  }
}
