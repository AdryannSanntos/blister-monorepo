import { Module, forwardRef } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController, CompaniesController } from './company.controller';
import { BrandService, RAG_EVENTS_SERVICE } from './brand/brand.service';
import { BrandController } from './brand/brand.controller';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { RagModule } from '../rag/rag.module';
import { RagEventsService } from '../rag/rag-events.service';

@Module({
  imports: [PrismaModule, AuditModule, forwardRef(() => StorageModule), RagModule],
  controllers: [CompanyController, CompaniesController, BrandController],
  providers: [
    CompanyService,
    BrandService,
    { provide: RAG_EVENTS_SERVICE, useExisting: RagEventsService },
  ],
  exports: [CompanyService, BrandService],
})
export class CompanyModule {}
