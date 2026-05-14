import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { acceptInvitationSchema, createInvitationSchema } from './dto';
import { InvitationService } from './invitation.service';

@Controller('organizations/:orgId/invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Get()
  @RequirePermission('member.read')
  async findAll(@Param('orgId') orgId: string) {
    return this.invitationService.findByOrganization(orgId);
  }

  @Post()
  @RequirePermission('member.invite')
  async create(
    @Param('orgId') orgId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = createInvitationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const currentUser = (req as unknown as Record<string, unknown>)['currentUser'] as CurrentUser;

    return this.invitationService.create(orgId, currentUser.id, parsed.data);
  }

  @Post(':invitationId/accept')
  @Public()
  async accept(@Param('invitationId') invitationId: string, @Body() body: unknown) {
    const parsed = acceptInvitationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.invitationService.accept(invitationId, parsed.data.userId);
  }

  @Post(':invitationId/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('member.invite')
  async cancel(@Param('invitationId') invitationId: string) {
    await this.invitationService.cancel(invitationId);
  }
}
