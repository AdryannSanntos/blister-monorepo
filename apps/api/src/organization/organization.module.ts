import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionGuard } from './guards/permission.guard';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationController, RoleController, MembershipController, InvitationController],
  providers: [
    OrganizationService,
    RoleService,
    MembershipService,
    InvitationService,
    PermissionGuard,
  ],
  exports: [OrganizationService, RoleService, MembershipService, InvitationService],
})
export class OrganizationModule {}
