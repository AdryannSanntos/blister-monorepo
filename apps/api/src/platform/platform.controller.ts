import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../auth/session.service';
import { RequirePlatformRole } from './decorators/require-platform-role.decorator';
import { assignPlatformRoleSchema, startSupportSessionSchema } from './dto';
import { PlatformRoleGuard } from './guards/platform-role.guard';
import { PlatformService } from './platform.service';

@Controller('platform')
@UseGuards(PlatformRoleGuard)
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  /**
   * GET /platform/admins
   * List all platform role assignments (platform_admin+)
   */
  @Get('admins')
  @RequirePlatformRole('platform_admin')
  async listAdmins() {
    return this.platformService.listPlatformAdmins();
  }

  /**
   * POST /platform/admins/:userId
   * Assign a platform role to a user (platform_owner only)
   * userId comes from route param, never from request body.
   */
  @Post('admins/:userId')
  @RequirePlatformRole('platform_owner')
  async assignRole(
    @Param('userId') targetUserId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = assignPlatformRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;

    return this.platformService.assignPlatformRole(currentUser.id, targetUserId, parsed.data);
  }

  /**
   * DELETE /platform/admins/:assignmentId
   * Remove a platform role assignment (platform_owner only)
   */
  @Delete('admins/:assignmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePlatformRole('platform_owner')
  async removeRole(@Param('assignmentId') assignmentId: string, @Req() req: Request) {
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;

    await this.platformService.removePlatformRole(currentUser.id, assignmentId);
  }

  /**
   * POST /platform/support/sessions
   * Start a support session (platform_admin+)
   */
  @Post('support/sessions')
  @RequirePlatformRole('platform_admin')
  async startSession(@Body() body: unknown, @Req() req: Request) {
    const parsed = startSupportSessionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;

    return this.platformService.startSupportSession(currentUser.id, parsed.data);
  }

  /**
   * PATCH /platform/support/sessions/:sessionId/end
   * End an active support session (platform_admin+)
   */
  @Patch('support/sessions/:sessionId/end')
  @RequirePlatformRole('platform_admin')
  async endSession(@Param('sessionId') sessionId: string, @Req() req: Request) {
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;

    return this.platformService.endSupportSession(currentUser.id, sessionId);
  }
}
