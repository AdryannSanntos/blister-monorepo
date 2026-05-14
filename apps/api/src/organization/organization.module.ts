import { Module } from '@nestjs/common';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';

@Module({
  controllers: [OrganizationController, RoleController, MembershipController, InvitationController],
  providers: [OrganizationService, RoleService, MembershipService, InvitationService],
  exports: [OrganizationService, RoleService, MembershipService, InvitationService],
})
export class OrganizationModule {}
