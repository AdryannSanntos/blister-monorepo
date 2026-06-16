import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PermissionGuard } from './guards/permission.guard';

@Module({
  imports: [AuditModule, WorkspaceModule],
  controllers: [UsersController, RolesController, MembersController],
  providers: [UsersService, RolesService, MembersService, PermissionGuard],
  exports: [UsersService, RolesService, MembersService, PermissionGuard],
})
export class UsersModule {}
