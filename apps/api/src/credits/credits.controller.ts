import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../auth/session.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { WorkspaceContextService } from '../workspace/workspace-context.service';
import { CreditService } from './credits.service';
import { creditHistoryQuerySchema } from './dto/credits.dto';

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

    if (workspace.type === 'personal') {
      return this.creditService.getPersonalSummary(workspace.personalSpaceId);
    }

    return this.creditService.getSummary(workspace.companyId);
  }

  @Get('history')
  @RequirePermission('credit.read')
  async getHistory(@Req() req: Request, @Query() query: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = creditHistoryQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const workspace = await this.workspaceContext.resolveFromRequest(user.id, req);

    if (workspace.type === 'personal') {
      return this.creditService.getPersonalHistory(
        workspace.personalSpaceId,
        parsed.data.page,
        parsed.data.pageSize,
      );
    }

    return this.creditService.getHistory(
      workspace.companyId,
      parsed.data.page,
      parsed.data.pageSize,
    );
  }
}
