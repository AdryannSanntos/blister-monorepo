import {
  createFolderSchema,
  filePresignedUploadRequestSchema,
  updateFolderSchema,
  updateWorkspaceFileSchema,
} from '@company-os/types';
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
import { z } from 'zod';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { FilesService } from './files.service';

const uploadBodySchema = z.object({
  folderId: z.string().optional(),
  name: z.string().min(1),
  mimeType: z.string().min(1),
  storageKey: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().optional(),
  extractData: z.boolean().optional(),
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

  @Patch('folders/:id')
  @RequirePermission('file.create')
  updateFolder(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = updateFolderSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.filesService.updateFolder(user.id, req, id, parsed.data);
  }

  @Delete('folders/:id')
  @RequirePermission('file.delete')
  deleteFolder(@Req() req: Request, @Param('id') id: string) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.filesService.deleteFolder(user.id, req, id);
  }

  @Post('presigned-upload')
  @RequirePermission('file.create')
  presignedUpload(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = filePresignedUploadRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.filesService.createPresignedUpload(user.id, req, parsed.data);
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
    const parsed = updateWorkspaceFileSchema.safeParse(body);
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
