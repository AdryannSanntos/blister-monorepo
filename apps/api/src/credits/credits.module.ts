import { Module } from '@nestjs/common';
import { CreditService } from './credits.service';
import { CreditsController } from './credits.controller';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [PrismaModule, AuditModule, WorkspaceModule],
  controllers: [CreditsController],
  providers: [CreditService],
  exports: [CreditService],
})
export class CreditsModule {}
