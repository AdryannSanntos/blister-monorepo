import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../auth/session.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PersonalSpaceService } from './personal-space.service';

@Controller('personal-space')
export class PersonalSpaceController {
  constructor(private readonly personalSpaceService: PersonalSpaceService) {}

  @Get('context')
  @RequirePermission('workspace.read')
  async getWorkspaceContext(@Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.personalSpaceService.resolveActiveWorkspace(user.id, req);
  }
}
