import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { inviteMemberSchema } from './dto/members.dto';
import { MembersService } from './members.service';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @RequirePermission('member.read')
  listMembers() {
    return this.membersService.listMembers();
  }

  @Post('invite')
  @RequirePermission('member.invite')
  async inviteMember(@Req() req: Request, @Body() body: unknown) {
    const parsed = inviteMemberSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);

    const currentUser = (req as unknown as Record<string, unknown>)
      .currentUser as CurrentUser;

    return this.membersService.inviteMember(currentUser.id, parsed.data);
  }

  @Post(':userId/roles/:roleId')
  @RequirePermission('member.update')
  async assignRole(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    const currentUser = (req as unknown as Record<string, unknown>)
      .currentUser as CurrentUser;

    await this.membersService.assignRole(currentUser.id, userId, roleId);
    return { success: true };
  }

  @Delete(':userId/roles/:roleId')
  @RequirePermission('member.update')
  async removeRole(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    const currentUser = (req as unknown as Record<string, unknown>)
      .currentUser as CurrentUser;

    await this.membersService.removeRole(currentUser.id, userId, roleId);
    return { success: true };
  }

  @Delete(':userId')
  @RequirePermission('member.remove')
  async removeMember(@Req() req: Request, @Param('userId') userId: string) {
    const currentUser = (req as unknown as Record<string, unknown>)
      .currentUser as CurrentUser;

    await this.membersService.removeMember(currentUser.id, userId);
    return { success: true };
  }
}
