import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { createFolderSchema } from '@company-os/types';
import { z } from 'zod';
import type { CurrentUser } from '../auth/session.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { FilesService } from './files.service';

const uploadBodySchema = z.object({
  folderId: z.string().optional(),
  name: z.string().min(1),
  mimeType: z.string().min(1),
  storageKey: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().optional(),
  extractData: z.boolean().optional(),
});

const updateFileSchema = z.object({
  name: z.string().min(1).optional(),
  folderId: z.string().optional(),
});

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('browse')
  @RequirePermission('file.read')
  browse(@Req() req: Request, @Query('folderId') folderId?: string) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.filesService.browse(user.id, req, folderId);
  }

  @Get('breadcrumb/:folderId')
  @RequirePermission('file.read')
  breadcrumb(@Req() req: Request, @Param('folderId') folderId: string) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.filesService.breadcrumb(user.id, req, folderId);
  }

  @Post('folders')
  @RequirePermission('file.create')
  createFolder(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = createFolderSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.filesService.createFolder(user.id, req, parsed.data);
  }

  @Post('upload')
  @RequirePermission('file.create')
  upload(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = uploadBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.filesService.registerUpload(user.id, req, parsed.data);
  }

  @Get(':id/preview')
  @RequirePermission('file.read')
  preview(@Req() req: Request, @Param('id') id: string) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.filesService.getPreviewUrl(user.id, req, id);
  }

  @Patch(':id')
  @RequirePermission('file.create')
  update(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = updateFileSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.filesService.updateFile(user.id, req, id, parsed.data);
  }

  @Post(':id/extract')
  @RequirePermission('file.create')
  extract(@Req() req: Request, @Param('id') id: string) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.filesService.requestExtract(user.id, req, id);
  }

  @Delete(':id')
  @RequirePermission('file.delete')
  delete(@Req() req: Request, @Param('id') id: string) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.filesService.deleteFile(user.id, req, id);
  }
}
