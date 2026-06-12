import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceContextService } from './workspace-context.service';

@Module({
  imports: [PrismaModule],
  providers: [WorkspaceContextService],
  exports: [WorkspaceContextService],
})
export class WorkspaceModule {}
