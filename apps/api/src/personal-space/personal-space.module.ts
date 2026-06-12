import { Module } from '@nestjs/common';
import { WorkspaceModule } from '../workspace/workspace.module';
import { PersonalSpaceController } from './personal-space.controller';
import { PersonalSpaceService } from './personal-space.service';

@Module({
  imports: [WorkspaceModule],
  controllers: [PersonalSpaceController],
  providers: [PersonalSpaceService],
  exports: [PersonalSpaceService],
})
export class PersonalSpaceModule {}
