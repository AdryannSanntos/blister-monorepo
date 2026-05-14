import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { acceptInvitationSchema, createInvitationSchema } from './dto';
import { InvitationService } from './invitation.service';

@Controller('organizations/:orgId/invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Get()
  async findAll(@Param('orgId') orgId: string) {
    return this.invitationService.findByOrganization(orgId);
  }

  @Post()
  async create(
    @Param('orgId') orgId: string,
    @Body() body: { inviterId: string; email: string; roleId?: string },
  ) {
    const parsed = createInvitationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.invitationService.create(orgId, body.inviterId, parsed.data);
  }

  @Post(':invitationId/accept')
  async accept(@Param('invitationId') invitationId: string, @Body() body: unknown) {
    const parsed = acceptInvitationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.invitationService.accept(invitationId, parsed.data.userId);
  }

  @Post(':invitationId/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(@Param('invitationId') invitationId: string) {
    await this.invitationService.cancel(invitationId);
  }
}
