import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { PersonalSpaceDto } from '@company-os/types';
import { WorkspaceContextService } from '../workspace/workspace-context.service';

@Injectable()
export class PersonalSpaceService {
  constructor(private readonly workspaceContext: WorkspaceContextService) {}

  async getPersonalSpace(userId: string): Promise<PersonalSpaceDto> {
    const personalSpace = await this.workspaceContext.ensurePersonalSpace(userId);
    return {
      id: personalSpace.id,
      name: personalSpace.name,
      createdAt: personalSpace.createdAt.toISOString(),
      updatedAt: personalSpace.updatedAt.toISOString(),
    };
  }

  async resolveActiveWorkspace(userId: string, req: Request) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const accessible = await this.workspaceContext.listAccessibleWorkspaces(userId);

    return {
      active: workspace,
      personal: {
        id: accessible.personal.id,
        type: 'personal' as const,
        name: accessible.personal.name,
      },
      companies: accessible.companies.map((company) => ({
        id: company.id,
        type: 'company' as const,
        name: company.name,
        onboardingCompletedAt: company.onboardingCompletedAt?.toISOString() ?? null,
      })),
    };
  }
}
