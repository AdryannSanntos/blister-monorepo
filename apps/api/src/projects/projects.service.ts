import { Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import type { CreateProjectDto, ProjectDto, UpdateProjectDto } from '@company-os/types';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceContextService } from '../workspace/workspace-context.service';

const serializeProject = (project: {
  id: string;
  name: string;
  objective: string;
  linkedAgentIds: string[];
  createdAt: Date;
  updatedAt: Date;
}): ProjectDto => ({
  id: project.id,
  name: project.name,
  objective: project.objective,
  linkedAgentIds: project.linkedAgentIds,
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
});

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  private workspaceWhere(workspace: Awaited<
    ReturnType<WorkspaceContextService['resolveFromRequest']>
  >) {
    return { companyId: workspace.companyId };
  }

  async list(userId: string, req: Request): Promise<ProjectDto[]> {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const projects = await this.prisma.project.findMany({
      where: this.workspaceWhere(workspace),
      orderBy: { updatedAt: 'desc' },
    });
    return projects.map(serializeProject);
  }

  async create(userId: string, req: Request, dto: CreateProjectDto) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const project = await this.prisma.project.create({
      data: {
        ...this.workspaceWhere(workspace),
        name: dto.name,
        objective: dto.objective,
        linkedAgentIds: dto.linkedAgentIds ?? [],
      },
    });
    return serializeProject(project);
  }

  async update(userId: string, req: Request, projectId: string, dto: UpdateProjectDto) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const existing = await this.prisma.project.findFirst({
      where: { id: projectId, ...this.workspaceWhere(workspace) },
    });
    if (!existing) throw new NotFoundException('Project not found');

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: dto.name,
        objective: dto.objective,
        linkedAgentIds: dto.linkedAgentIds,
      },
    });
    return serializeProject(project);
  }

  async delete(userId: string, req: Request, projectId: string) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const existing = await this.prisma.project.findFirst({
      where: { id: projectId, ...this.workspaceWhere(workspace) },
    });
    if (!existing) throw new NotFoundException('Project not found');

    await this.prisma.project.delete({ where: { id: projectId } });
    return { success: true };
  }
}
