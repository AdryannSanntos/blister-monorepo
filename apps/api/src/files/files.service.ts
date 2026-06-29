import type {
  CreateFolderDto,
  FileBrowseResponse,
  FilePresignedUploadRequest,
  FilePresignedUploadResponse,
  UpdateFolderDto,
  WorkspaceFileDto,
  WorkspaceFolderDto,
} from '@company-os/types';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  type ResolvedWorkspace,
  WorkspaceContextService,
} from '../workspace/workspace-context.service';
import { ensureWorkspaceAgentFolders } from './workspace-folders.util';
import {
  type WorkspaceStorageRoot,
  buildFileKey,
  buildFolderPlaceholderKey,
  buildFolderPrefix,
  sanitizeStorageSegment,
  withCollisionSuffix,
  workspaceRootPrefix,
} from './workspace-storage.util';

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

type WorkspaceWhere =
  | { personalSpaceId: string; companyId?: never }
  | { companyId: string; personalSpaceId?: never };

/** Default destination folder for manual uploads with no explicit folder. */
const DEFAULT_UPLOADS_FOLDER_NAME = 'Uploads';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly storage: StorageService,
  ) {}

  private workspaceWhere(workspace: ResolvedWorkspace): WorkspaceWhere {
    return { companyId: workspace.companyId };
  }

  /** Resolves the S3 root prefix owner for a workspace (slug or user id). */
  private async resolveStorageRoot(workspace: ResolvedWorkspace): Promise<WorkspaceStorageRoot> {
    if (workspace.type === 'company') {
      const company = await this.prisma.company.findUnique({
        where: { id: workspace.companyId },
        select: { slug: true },
      });
      if (!company) throw new NotFoundException('Company not found');
      return { kind: 'company', slug: company.slug };
    }
    return { kind: 'personal', userId: workspace.userId };
  }

  /** Ordered folder names from the workspace root down to (and incl.) folderId. */
  private async folderPathSegments(
    scope: WorkspaceWhere,
    folderId: string | null,
  ): Promise<string[]> {
    const segments: string[] = [];
    let currentId = folderId;

    while (currentId) {
      const folder = await this.prisma.workspaceFolder.findFirst({
        where: { id: currentId, ...scope },
        select: { name: true, parentId: true },
      });
      if (!folder) break;
      segments.unshift(folder.name);
      currentId = folder.parentId;
    }

    return segments;
  }

  /** S3 prefix (ending in `/`) for a folder, mirroring the DB tree. */
  private async folderPrefix(
    workspace: ResolvedWorkspace,
    folderId: string | null,
  ): Promise<string> {
    const root = await this.resolveStorageRoot(workspace);
    if (!folderId) return workspaceRootPrefix(root);
    const segments = await this.folderPathSegments(this.workspaceWhere(workspace), folderId);
    return buildFolderPrefix(root, segments);
  }

  /** Returns a file name unique within the folder (appends " (n)" on clash). */
  private async uniqueFileName(
    scope: WorkspaceWhere,
    folderId: string,
    desired: string,
    excludeFileId?: string,
  ): Promise<string> {
    const siblings = await this.prisma.workspaceFile.findMany({
      where: {
        folderId,
        ...scope,
        ...(excludeFileId ? { id: { not: excludeFileId } } : {}),
      },
      select: { name: true },
    });
    // Dedupe on the sanitized S3 segment, not the raw name, so two names that
    // sanitize to the same key (e.g. "a/b" and "a-b") never collide in S3.
    const taken = new Set(siblings.map((file) => sanitizeStorageSegment(file.name).toLowerCase()));

    const key = (value: string) => sanitizeStorageSegment(value).toLowerCase();
    if (!taken.has(key(desired))) return desired;

    for (let counter = 1; counter < 1000; counter++) {
      const candidate = withCollisionSuffix(desired, counter);
      if (!taken.has(key(candidate))) return candidate;
    }
    return withCollisionSuffix(desired, Date.now());
  }

  /** Returns a folder name unique within the parent (appends " (n)" on clash). */
  private async uniqueFolderName(
    scope: WorkspaceWhere,
    parentId: string | null,
    desired: string,
    excludeFolderId?: string,
  ): Promise<string> {
    const siblings = await this.prisma.workspaceFolder.findMany({
      where: {
        parentId,
        ...scope,
        ...(excludeFolderId ? { id: { not: excludeFolderId } } : {}),
      },
      select: { name: true },
    });
    // Dedupe on the sanitized S3 segment so colliding prefixes can't overwrite.
    const taken = new Set(
      siblings.map((folder) => sanitizeStorageSegment(folder.name).toLowerCase()),
    );

    const key = (value: string) => sanitizeStorageSegment(value).toLowerCase();
    if (!taken.has(key(desired))) return desired;

    for (let counter = 1; counter < 1000; counter++) {
      const candidate = `${desired} (${counter})`;
      if (!taken.has(key(candidate))) return candidate;
    }
    return `${desired} (${Date.now()})`;
  }

  /** True when `candidateId` is `folderId` itself or one of its descendants. */
  private async isFolderInSubtree(
    scope: WorkspaceWhere,
    folderId: string,
    candidateId: string,
  ): Promise<boolean> {
    let currentId: string | null = candidateId;
    while (currentId) {
      if (currentId === folderId) return true;
      const folder: { parentId: string | null } | null =
        await this.prisma.workspaceFolder.findFirst({
          where: { id: currentId, ...scope },
          select: { parentId: true },
        });
      if (!folder) break;
      currentId = folder.parentId;
    }
    return false;
  }

  async browse(userId: string, req: Request, folderId?: string): Promise<FileBrowseResponse> {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const scope = this.workspaceWhere(workspace);

    await this.workspaceContext.ensureCompanyAgentFolders(workspace.companyId);

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

    const name = await this.uniqueFolderName(scope, dto.parentId ?? null, dto.name);

    const folder = await this.prisma.workspaceFolder.create({
      data: {
        ...scope,
        name,
        parentId: dto.parentId ?? null,
        kind: 'USER',
      },
      include: { _count: { select: { files: true } } },
    });

    // Mirror the folder into S3 with a placeholder so it is visible even empty.
    await this.mirrorFolderPlaceholder(workspace, folder.id);

    return serializeFolder(folder);
  }

  /** Writes the `.keep` placeholder for a folder; logs (does not throw) on failure. */
  private async mirrorFolderPlaceholder(
    workspace: ResolvedWorkspace,
    folderId: string,
  ): Promise<void> {
    try {
      const prefix = await this.folderPrefix(workspace, folderId);
      await this.storage.putEmptyObject(buildFolderPlaceholderKey(prefix));
    } catch (error) {
      this.logger.warn(
        `Could not write folder placeholder for ${folderId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  /**
   * Resolves the destination folder for an upload from an explicit folderId,
   * an agentId (its system folder), or the default agent folder.
   */
  private async resolveUploadFolderId(
    workspace: ResolvedWorkspace,
    scope: WorkspaceWhere,
    params: { folderId?: string },
  ): Promise<string> {
    if (params.folderId) {
      const folder = await this.prisma.workspaceFolder.findFirst({
        where: { id: params.folderId, ...scope },
        select: { id: true, kind: true },
      });
      if (!folder) throw new NotFoundException('Folder not found');
      // Agent (SYSTEM) folders only hold agent-generated files; manual uploads
      // must live in a user folder.
      if (folder.kind === 'SYSTEM') {
        throw new BadRequestException('Manual uploads cannot be placed in an agent folder');
      }
      return folder.id;
    }

    return this.ensureDefaultUploadsFolderId(workspace, scope);
  }

  /** Finds (or creates) the default "Uploads" user folder at the workspace root. */
  private async ensureDefaultUploadsFolderId(
    workspace: ResolvedWorkspace,
    scope: WorkspaceWhere,
  ): Promise<string> {
    const existing = await this.prisma.workspaceFolder.findFirst({
      where: {
        ...scope,
        parentId: null,
        kind: 'USER',
        name: DEFAULT_UPLOADS_FOLDER_NAME,
      },
      select: { id: true },
    });
    if (existing) return existing.id;

    const folder = await this.prisma.workspaceFolder.create({
      data: {
        ...scope,
        name: DEFAULT_UPLOADS_FOLDER_NAME,
        parentId: null,
        kind: 'USER',
      },
      select: { id: true },
    });
    await this.mirrorFolderPlaceholder(workspace, folder.id);
    return folder.id;
  }

  /**
   * Issues a presigned PUT whose key mirrors the destination folder in the DB
   * tree, reserving a collision-free file name. The browser uploads straight to
   * that key, then calls registerUpload with the same key + reserved name.
   */
  async createPresignedUpload(
    userId: string,
    req: Request,
    params: FilePresignedUploadRequest,
  ): Promise<FilePresignedUploadResponse> {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const scope = this.workspaceWhere(workspace);

    const folderId = await this.resolveUploadFolderId(workspace, scope, params);
    const name = await this.uniqueFileName(scope, folderId, params.name);
    const prefix = await this.folderPrefix(workspace, folderId);
    const key = buildFileKey(prefix, name);

    const presigned = await this.storage.getPresignedUploadUrl(key, params.mimeType);

    return {
      url: presigned.url,
      key: presigned.key,
      folderId,
      name,
      expiresIn: presigned.expiresIn,
    };
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

    const folderId = await this.resolveUploadFolderId(workspace, scope, params);

    // The stored key must mirror the DB tree exactly so both sides stay synced.
    const prefix = await this.folderPrefix(workspace, folderId);
    const expectedKey = buildFileKey(prefix, params.name);
    if (params.storageKey !== expectedKey) {
      throw new BadRequestException('storageKey does not match the resolved folder path');
    }

    const file = await this.prisma.workspaceFile.create({
      data: {
        ...scope,
        folderId,
        name: params.name,
        mimeType: params.mimeType,
        storageKey: expectedKey,
        sizeBytes: params.sizeBytes,
        extractData: params.extractData ?? false,
        status: 'INDEXED',
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

    const url = await this.storage.getPresignedDownloadUrl(
      file.storageKey,
      24 * 60 * 60,
    );
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

    const targetFolderId = data.folderId ?? file.folderId;
    if (data.folderId) {
      const folder = await this.prisma.workspaceFolder.findFirst({
        where: { id: data.folderId, ...scope },
      });
      if (!folder) throw new NotFoundException('Target folder not found');
    }

    const desiredName = data.name ?? file.name;
    const newName = await this.uniqueFileName(scope, targetFolderId, desiredName, fileId);

    const prefix = await this.folderPrefix(workspace, targetFolderId);
    const newKey = buildFileKey(prefix, newName);

    // Move the object in S3 to keep the bucket layout mirroring the DB.
    if (newKey !== file.storageKey) {
      await this.storage.copyObject(file.storageKey, newKey);
      await this.storage.deleteObject(file.storageKey).catch((error) => {
        this.logger.warn(
          `Could not delete old object ${file.storageKey} after move: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      });
    }

    const updated = await this.prisma.workspaceFile.update({
      where: { id: fileId },
      data: {
        name: newName,
        folderId: targetFolderId,
        storageKey: newKey,
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

    // Delete the object from S3 first; the DB row is the source of truth.
    await this.storage.deleteObject(file.storageKey).catch((error) => {
      this.logger.warn(
        `Could not delete object ${file.storageKey}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    });

    await this.prisma.workspaceFile.delete({ where: { id: fileId } });
    return { success: true };
  }

  /**
   * Renames and/or moves a user folder. SYSTEM/agent folders are immutable.
   * Re-keys every descendant object in S3 so the bucket keeps mirroring the DB.
   */
  async updateFolder(
    userId: string,
    req: Request,
    folderId: string,
    data: UpdateFolderDto,
  ): Promise<WorkspaceFolderDto> {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const scope = this.workspaceWhere(workspace);

    const folder = await this.prisma.workspaceFolder.findFirst({
      where: { id: folderId, ...scope },
    });
    if (!folder) throw new NotFoundException('Folder not found');
    if (folder.kind === 'SYSTEM') {
      throw new BadRequestException('System folders cannot be modified');
    }

    const newParentId = data.parentId === undefined ? folder.parentId : data.parentId;

    if (data.parentId !== undefined && data.parentId !== null) {
      const parent = await this.prisma.workspaceFolder.findFirst({
        where: { id: data.parentId, ...scope },
        select: { id: true },
      });
      if (!parent) throw new NotFoundException('Target folder not found');
      // Moving a folder into itself or one of its descendants would orphan it.
      if (await this.isFolderInSubtree(scope, folderId, data.parentId)) {
        throw new BadRequestException('A folder cannot be moved into itself or its descendants');
      }
    }

    const desiredName = data.name ?? folder.name;
    const newName = await this.uniqueFolderName(scope, newParentId, desiredName, folderId);

    const oldPrefix = await this.folderPrefix(workspace, folderId);

    const updated = await this.prisma.workspaceFolder.update({
      where: { id: folderId },
      data: { name: newName, parentId: newParentId },
      include: { _count: { select: { files: true } } },
    });

    const newPrefix = await this.folderPrefix(workspace, folderId);
    if (newPrefix !== oldPrefix) {
      await this.rekeyPrefix(workspace, scope, oldPrefix, newPrefix);
    }

    return serializeFolder(updated);
  }

  /**
   * Moves every object under `oldPrefix` to `newPrefix` in S3 and updates the
   * affected workspaceFile.storageKey rows to match.
   */
  private async rekeyPrefix(
    workspace: ResolvedWorkspace,
    scope: WorkspaceWhere,
    oldPrefix: string,
    newPrefix: string,
  ): Promise<void> {
    const keys = await this.storage.listObjectKeys(oldPrefix);
    // Track which source keys actually made it to their new location so the DB
    // is only updated for objects that truly moved (no DB/bucket divergence).
    const moved = new Set<string>();
    for (const oldKey of keys) {
      const newKey = `${newPrefix}${oldKey.slice(oldPrefix.length)}`;
      if (newKey === oldKey) {
        moved.add(oldKey);
        continue;
      }
      try {
        await this.storage.copyObject(oldKey, newKey);
        // Object now exists at newKey; the old copy is best-effort cleanup.
        await this.storage.deleteObject(oldKey).catch(() => undefined);
        moved.add(oldKey);
      } catch (error) {
        this.logger.warn(
          `Could not re-key object ${oldKey} -> ${newKey}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }

    // Re-derive storageKey only for files whose object actually moved, so a DB
    // row never points at a key the copy failed to create.
    const files = await this.prisma.workspaceFile.findMany({
      where: { ...scope, storageKey: { startsWith: oldPrefix } },
      select: { id: true, storageKey: true },
    });
    for (const file of files) {
      if (!moved.has(file.storageKey)) continue;
      const newKey = `${newPrefix}${file.storageKey.slice(oldPrefix.length)}`;
      if (newKey === file.storageKey) continue;
      await this.prisma.workspaceFile.update({
        where: { id: file.id },
        data: { storageKey: newKey },
      });
    }
  }

  /**
   * Deletes a user folder, its entire subtree (DB cascade), and every S3 object
   * under its prefix. SYSTEM/agent folders cannot be deleted.
   */
  async deleteFolder(userId: string, req: Request, folderId: string) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const scope = this.workspaceWhere(workspace);

    const folder = await this.prisma.workspaceFolder.findFirst({
      where: { id: folderId, ...scope },
    });
    if (!folder) throw new NotFoundException('Folder not found');
    if (folder.kind === 'SYSTEM') {
      throw new BadRequestException('System folders cannot be deleted');
    }

    const prefix = await this.folderPrefix(workspace, folderId);
    const keys = await this.storage.listObjectKeys(prefix);
    if (keys.length > 0) {
      await this.storage.deleteObjects(keys).catch((error) => {
        this.logger.warn(
          `Could not delete objects under ${prefix}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      });
    }

    // onDelete: Cascade removes child folders and their files in the DB.
    await this.prisma.workspaceFolder.delete({ where: { id: folderId } });
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
