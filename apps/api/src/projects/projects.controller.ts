import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { createProjectSchema, updateProjectSchema } from '@company-os/types';
import type { CurrentUser } from '../auth/session.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RequirePermission('project.read')
  list(@Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.projectsService.list(user.id, req);
  }

  @Post()
  @RequirePermission('project.create')
  create(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.projectsService.create(user.id, req, parsed.data);
  }

  @Patch(':id')
  @RequirePermission('project.update')
  update(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.projectsService.update(user.id, req, id, parsed.data);
  }

  @Delete(':id')
  @RequirePermission('project.delete')
  delete(@Req() req: Request, @Param('id') id: string) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.projectsService.delete(user.id, req, id);
  }
}
