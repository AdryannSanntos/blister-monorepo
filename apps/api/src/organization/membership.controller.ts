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
import { membershipOverrideSchema } from './dto';
import { MembershipService } from './membership.service';

@Controller('organizations/:orgId/members')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get()
  async findAll(@Param('orgId') orgId: string) {
    return this.membershipService.findByOrganization(orgId);
  }

  @Post(':membershipId/roles/:roleId')
  async addRole(@Param('membershipId') membershipId: string, @Param('roleId') roleId: string) {
    return this.membershipService.addRole(membershipId, roleId);
  }

  @Delete(':membershipId/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRole(@Param('membershipId') membershipId: string, @Param('roleId') roleId: string) {
    await this.membershipService.removeRole(membershipId, roleId);
  }

  @Post(':membershipId/overrides')
  async setOverride(@Param('membershipId') membershipId: string, @Body() body: unknown) {
    const parsed = membershipOverrideSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.membershipService.setOverride(membershipId, parsed.data.key, parsed.data.effect);
  }

  @Delete(':membershipId/overrides/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOverride(@Param('membershipId') membershipId: string, @Param('key') key: string) {
    await this.membershipService.removeOverride(membershipId, key);
  }
}
