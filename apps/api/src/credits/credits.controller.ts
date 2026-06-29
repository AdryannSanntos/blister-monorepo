import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../auth/session.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { WorkspaceContextService } from '../workspace/workspace-context.service';
import { CreditService } from './credits.service';

@Controller('company/credits')
export class CreditsController {
  constructor(
    private readonly creditService: CreditService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  @Get()
  @RequirePermission('credit.read')
  async getSummary(@Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const workspace = await this.workspaceContext.resolveFromRequest(user.id, req);
    return this.creditService.getSummary(workspace.companyId);
  }

  @Get('agent-spend')
  @RequirePermission('credit.read')
  async getAgentSpend(@Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const workspace = await this.workspaceContext.resolveFromRequest(user.id, req);
    return this.creditService.getAgentSpend({ type: 'company', companyId: workspace.companyId });
  }
}
