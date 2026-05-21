import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { PlatformRoleGuard } from './guards/platform-role.guard';

@Module({
  controllers: [PlatformController],
  providers: [PlatformService, PlatformRoleGuard],
  exports: [PlatformService, PlatformRoleGuard],
})
export class PlatformModule {}
