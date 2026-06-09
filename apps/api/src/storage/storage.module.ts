import {
  Module,
  forwardRef,
} from '@nestjs/common';
import { CompanyModule } from '../company/company.module';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Module({
  imports: [forwardRef(() => CompanyModule)],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
