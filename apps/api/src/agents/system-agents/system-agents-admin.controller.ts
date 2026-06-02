import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../../auth/session.service';
import { RequirePlatformRole } from '../../platform/decorators/require-platform-role.decorator';
import { PlatformRoleGuard } from '../../platform/guards/platform-role.guard';
import { testSystemAgentSchema, updateSystemAgentConfigSchema } from './dto/system-agent-admin.dto';
import { SystemAgentsService } from './system-agents.service';

/**
 * Admin de plataforma dos agentes de sistema. Protegido por `PlatformRoleGuard`:
 * nenhum usuário de empresa acessa — apenas platform_admin/platform_owner.
 */
@Controller('platform/system-agents')
@UseGuards(PlatformRoleGuard)
export class SystemAgentsAdminController {
  constructor(private readonly systemAgents: SystemAgentsService) {}

  @Get()
  @RequirePlatformRole('platform_admin')
  async list() {
    return this.systemAgents.listForAdmin();
  }

  @Get(':key')
  @RequirePlatformRole('platform_admin')
  async detail(@Param('key') key: string) {
    const agent = await this.systemAgents.getForAdmin(key);
    if (!agent) {
      throw new NotFoundException('System agent not found');
    }
    return agent;
  }

  @Patch(':key')
  @RequirePlatformRole('platform_admin')
  async update(@Param('key') key: string, @Body() body: unknown, @Req() req: Request) {
    const parsed = updateSystemAgentConfigSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    const updated = await this.systemAgents.updateConfig(key, parsed.data, currentUser.id);
    if (!updated) {
      throw new NotFoundException('System agent not found');
    }
    return updated;
  }

  @Post(':key/test')
  @RequirePlatformRole('platform_admin')
  async test(@Param('key') key: string, @Body() body: unknown) {
    const parsed = testSystemAgentSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const result = await this.systemAgents.runTest(
      key,
      parsed.data.input,
      parsed.data.organizationId,
    );
    if (!result) {
      throw new NotFoundException('System agent not found');
    }
    return result;
  }
}
