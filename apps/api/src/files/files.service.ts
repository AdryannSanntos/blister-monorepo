import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import type {
  CreateFolderDto,
  FileBrowseResponse,
  WorkspaceFileDto,
  WorkspaceFolderDto,
} from '@company-os/types';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { WorkspaceContextService } from '../workspace/workspace-context.service';

const serializeFile = (file: {
  id: string;
  folderId: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  status: string;
  extractData: boolean;
  origin: string;
  createdAt: Date;
  updatedAt: Date;
}): WorkspaceFileDto => ({
  id: file.id,
  folderId: file.folderId,
  name: file.name,
  mimeType: file.mimeType,
  sizeBytes: file.sizeBytes,
  status: file.status.toLowerCase() as WorkspaceFileDto['status'],
  extractData: file.extractData,
  origin: file.origin.toLowerCase() as WorkspaceFileDto['origin'],
  createdAt: file.createdAt.toISOString(),
  updatedAt: file.updatedAt.toISOString(),
});

type FolderRecord = {
  id: string;
  parentId: string | null;
  name: string;
  kind: string;
  systemKey: string | null;
  _count?: { files: number };
};

const serializeFolder = (folder: FolderRecord): WorkspaceFolderDto => ({
  id: folder.id,
  parentId: folder.parentId,
  name: folder.name,
  kind: folder.kind.toLowerCase() as WorkspaceFolderDto['kind'],
  systemKey: folder.systemKey,
  fileCount: folder._count?.files,
});

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly storage: StorageService,
  ) {}

  private workspaceWhere(workspace: Awaited<
    ReturnType<WorkspaceContextService['resolveFromRequest']>
  >) {
    return workspace.type === 'personal'
      ? { personalSpaceId: workspace.personalSpaceId }
      : { companyId: workspace.companyId };
  }

  async browse(userId: string, req: Request, folderId?: string): Promise<FileBrowseResponse> {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const scope = this.workspaceWhere(workspace);

    if (workspace.type === 'company') {
      await this.workspaceContext.ensureCompanySystemFolders(workspace.companyId);
    }

    const parentId = folderId ?? null;
    const parentFolder = parentId
      ? await this.prisma.workspaceFolder.findFirst({
          where: { id: parentId, ...scope },
        })
      : null;

    if (parentId && !parentFolder) {
      throw new NotFoundException('Folder not found');
    }

    const folders = await this.prisma.workspaceFolder.findMany({
      where: { parentId, ...scope },
      include: { _count: { select: { files: true } } },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });

    const files = parentId
      ? await this.prisma.workspaceFile.findMany({
          where: { folderId: parentId, ...scope },
          orderBy: { name: 'asc' },
        })
      : [];

    return {
      folderId: parentId,
      folders: folders.map(serializeFolder),
      files: files.map(serializeFile),
    };
  }

  async breadcrumb(userId: string, req: Request, folderId: string) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const scope = this.workspaceWhere(workspace);

    const trail: WorkspaceFolderDto[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const folder: FolderRecord | null = await this.prisma.workspaceFolder.findFirst({
        where: { id: currentId, ...scope },
      });
      if (!folder) break;
      trail.unshift(serializeFolder(folder));
      currentId = folder.parentId;
    }

    return trail;
  }

  async createFolder(userId: string, req: Request, dto: CreateFolderDto) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const scope = this.workspaceWhere(workspace);

    if (dto.parentId) {
      const parent = await this.prisma.workspaceFolder.findFirst({
        where: { id: dto.parentId, ...scope },
      });
      if (!parent) throw new NotFoundException('Parent folder not found');
    }

    const folder = await this.prisma.workspaceFolder.create({
      data: {
        ...scope,
        name: dto.name,
        parentId: dto.parentId ?? null,
        kind: 'USER',
      },
      include: { _count: { select: { files: true } } },
    });

    return serializeFolder(folder);
  }

  async registerUpload(
    userId: string,
    req: Request,
    params: {
      folderId?: string;
      name: string;
      mimeType: string;
      storageKey: string;
      sizeBytes?: number;
      extractData?: boolean;
    },
  ) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const scope = this.workspaceWhere(workspace);

    let folderId = params.folderId;
    if (!folderId) {
      const uploadsFolder = await this.prisma.workspaceFolder.findFirst({
        where: { ...scope, systemKey: 'uploads' },
      });
      if (!uploadsFolder) throw new NotFoundException('Uploads folder not found');
      folderId = uploadsFolder.id;
    }

    const folder = await this.prisma.workspaceFolder.findFirst({
      where: { id: folderId, ...scope },
    });
    if (!folder) throw new NotFoundException('Folder not found');

    const file = await this.prisma.workspaceFile.create({
      data: {
        ...scope,
        folderId,
        name: params.name,
        mimeType: params.mimeType,
        storageKey: params.storageKey,
        sizeBytes: params.sizeBytes,
        extractData: params.extractData ?? false,
        status: params.extractData ? 'PROCESSING' : 'PENDING',
      },
    });

    return serializeFile(file);
  }

  async getPreviewUrl(userId: string, req: Request, fileId: string) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const scope = this.workspaceWhere(workspace);

    const file = await this.prisma.workspaceFile.findFirst({
      where: { id: fileId, ...scope },
    });
    if (!file) throw new NotFoundException('File not found');

    const url = await this.storage.getPresignedDownloadUrl(file.storageKey);
    return { url, file: serializeFile(file) };
  }

  async updateFile(
    userId: string,
    req: Request,
    fileId: string,
    data: { name?: string; folderId?: string },
  ) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const scope = this.workspaceWhere(workspace);

    const file = await this.prisma.workspaceFile.findFirst({
      where: { id: fileId, ...scope },
    });
    if (!file) throw new NotFoundException('File not found');

    if (data.folderId) {
      const folder = await this.prisma.workspaceFolder.findFirst({
        where: { id: data.folderId, ...scope },
      });
      if (!folder) throw new NotFoundException('Target folder not found');
    }

    const updated = await this.prisma.workspaceFile.update({
      where: { id: fileId },
      data: {
        name: data.name,
        folderId: data.folderId,
      },
    });

    return serializeFile(updated);
  }

  async deleteFile(userId: string, req: Request, fileId: string) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const scope = this.workspaceWhere(workspace);

    const file = await this.prisma.workspaceFile.findFirst({
      where: { id: fileId, ...scope },
    });
    if (!file) throw new NotFoundException('File not found');

    await this.prisma.workspaceFile.delete({ where: { id: fileId } });
    return { success: true };
  }

  async requestExtract(userId: string, req: Request, fileId: string) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const scope = this.workspaceWhere(workspace);

    const file = await this.prisma.workspaceFile.findFirst({
      where: { id: fileId, ...scope },
    });
    if (!file) throw new NotFoundException('File not found');

    const updated = await this.prisma.workspaceFile.update({
      where: { id: fileId },
      data: { extractData: true, status: 'PROCESSING' },
    });

    return serializeFile(updated);
  }
}
