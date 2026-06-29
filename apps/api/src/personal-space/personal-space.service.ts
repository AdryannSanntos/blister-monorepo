import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { WorkspaceContextService } from '../workspace/workspace-context.service';

@Injectable()
export class PersonalSpaceService {
  constructor(private readonly workspaceContext: WorkspaceContextService) {}

  async resolveActiveWorkspace(userId: string, req: Request) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const accessible = await this.workspaceContext.listAccessibleWorkspaces(userId);

    return {
      active: workspace,
      companies: accessible.companies.map((company) => ({
        id: company.id,
        type: 'company' as const,
        name: company.name,
        onboardingCompletedAt: company.onboardingCompletedAt?.toISOString() ?? null,
      })),
    };
  }
}
