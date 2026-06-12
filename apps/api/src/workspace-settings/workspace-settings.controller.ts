import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  updateAgentWorkspaceSettingsSchema,
  updateWorkspaceSettingsSchema,
} from '@company-os/types';
import type { CurrentUser } from '../auth/session.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { WorkspaceSettingsService } from './workspace-settings.service';

@Controller()
export class WorkspaceSettingsController {
  constructor(private readonly workspaceSettingsService: WorkspaceSettingsService) {}

  @Get('personal-space/settings')
  @RequirePermission('workspace.settings.read')
  getPersonalSettings(@Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.workspaceSettingsService.getPersonalSettings(user.id);
  }

  @Patch('personal-space/settings')
  @RequirePermission('workspace.settings.update')
  updatePersonalSettings(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = updateWorkspaceSettingsSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.workspaceSettingsService.updatePersonalSettings(user.id, parsed.data);
  }

  @Get('company/settings')
  @RequirePermission('workspace.settings.read')
  getCompanySettings(@Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.workspaceSettingsService.getCompanySettings(user.id, req);
  }

  @Patch('company/settings')
  @RequirePermission('workspace.settings.update')
  updateCompanySettings(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = updateWorkspaceSettingsSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.workspaceSettingsService.updateCompanySettings(user.id, req, parsed.data);
  }

  @Get('workspace-settings/agents/:agentId')
  @RequirePermission('workspace.settings.read')
  getAgentSettings(@Req() req: Request, @Param('agentId') agentId: string) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.workspaceSettingsService.getAgentSettings(user.id, req, agentId);
  }

  @Patch('workspace-settings/agents/:agentId')
  @RequirePermission('workspace.settings.update')
  updateAgentSettings(
    @Req() req: Request,
    @Param('agentId') agentId: string,
    @Body() body: unknown,
  ) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = updateAgentWorkspaceSettingsSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.workspaceSettingsService.updateAgentSettings(user.id, req, agentId, parsed.data);
  }
}
