import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { membershipOverrideSchema } from './dto';
import { MembershipService } from './membership.service';

@Controller('organizations/:orgId/members')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get()
  @RequirePermission('member.read')
  async findAll(@Param('orgId') orgId: string) {
    return this.membershipService.findByOrganization(orgId);
  }

  @Post(':membershipId/roles/:roleId')
  @RequirePermission('member.update')
  async addRole(@Param('membershipId') membershipId: string, @Param('roleId') roleId: string) {
    return this.membershipService.addRole(membershipId, roleId);
  }

  @Delete(':membershipId/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('member.update')
  async removeRole(@Param('membershipId') membershipId: string, @Param('roleId') roleId: string) {
    await this.membershipService.removeRole(membershipId, roleId);
  }

  @Post(':membershipId/overrides')
  @RequirePermission('member.update')
  async setOverride(@Param('membershipId') membershipId: string, @Body() body: unknown) {
    const parsed = membershipOverrideSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.membershipService.setOverride(membershipId, parsed.data.key, parsed.data.effect);
  }

  @Delete(':membershipId/overrides/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('member.update')
  async removeOverride(@Param('membershipId') membershipId: string, @Param('key') key: string) {
    await this.membershipService.removeOverride(membershipId, key);
  }

  @Delete(':membershipId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('member.remove')
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('membershipId') membershipId: string,
  ) {
    await this.membershipService.removeMember(orgId, membershipId);
  }
}
