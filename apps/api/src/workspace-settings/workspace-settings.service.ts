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

  async getPersonalSettings(userId: string) {
    const personalSpace = await this.workspaceContext.ensurePersonalSpace(userId);
    const settings = await this.prisma.workspaceSettings.findUnique({
      where: { personalSpaceId: personalSpace.id },
    });
    if (!settings) throw new NotFoundException('Workspace settings not found');
    return serializeSettings(settings);
  }

  async updatePersonalSettings(userId: string, dto: UpdateWorkspaceSettingsDto) {
    const personalSpace = await this.workspaceContext.ensurePersonalSpace(userId);
    const updated = await this.prisma.workspaceSettings.update({
      where: { personalSpaceId: personalSpace.id },
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
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    if (workspace.type === 'personal') {
      return this.getPersonalSettings(userId);
    }
    return this.getCompanySettings(userId, req);
  }

  async updateActiveSettings(userId: string, req: Request, dto: UpdateWorkspaceSettingsDto) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    if (workspace.type === 'personal') {
      return this.updatePersonalSettings(userId, dto);
    }
    return this.updateCompanySettings(userId, req, dto);
  }

  async getAgentSettings(userId: string, req: Request, agentId: string) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const where =
      workspace.type === 'personal'
        ? { personalSpaceId: workspace.personalSpaceId, agentId }
        : { companyId: workspace.companyId, agentId };

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
      const entitlements = await this.marketplace.getEntitlements(userId, req, 'caption-style');
      const ownsStyle = entitlements.some((item) => item.id === parsedConfig.captionStyleId);
      if (!ownsStyle) {
        throw new BadRequestException('Caption style is not owned by this workspace');
      }
    }

    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);

    if (workspace.type === 'personal') {
      const saved = await this.prisma.agentWorkspaceSetting.upsert({
        where: {
          personalSpaceId_agentId: {
            personalSpaceId: workspace.personalSpaceId,
            agentId,
          },
        },
        create: {
          personalSpaceId: workspace.personalSpaceId,
          agentId,
          config: parsedConfig,
        },
        update: { config: parsedConfig },
      });

      return { agentId, config: cutsAgentSettingsSchema.parse(saved.config) };
    }

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
}
