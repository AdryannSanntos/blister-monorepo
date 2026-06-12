import type { WorkspaceFileDto, WorkspaceFolderDto } from "@company-os/types";

import type { FileEntry, FileFolder } from "../types/files.types";
import { formatBytes, inferFileKind, inferFileKindFromMime, formatIsoDate } from "./files-format";

export const FILES_ROOT_ID = "root";

export const getParentFolderId = (trail: FileFolder[]): string | null => {
  if (trail.length <= 1) return null;
  return trail[trail.length - 2]?.id ?? null;
};

export const createRootFolder = (name: string): FileFolder => ({
  id: FILES_ROOT_ID,
  name,
  parentId: null,
  kind: "user",
});

export const mapWorkspaceFolder = (dto: WorkspaceFolderDto): FileFolder => ({
  id: dto.id,
  name: dto.name,
  parentId: dto.parentId,
  kind: dto.kind,
  systemKey: (dto.systemKey as FileFolder["systemKey"]) ?? null,
});

export const mapWorkspaceFile = (dto: WorkspaceFileDto): FileEntry => ({
  id: dto.id,
  folderId: dto.folderId,
  name: dto.name,
  duration: null,
  size: dto.sizeBytes != null ? formatBytes(dto.sizeBytes) : "—",
  date: formatIsoDate(dto.createdAt),
  usedIn: null,
  kind: inferFileKindFromMime(dto.mimeType, dto.name),
  origin: dto.origin,
  status: dto.status,
});

export const toApiFolderId = (folderId: string) =>
  folderId === FILES_ROOT_ID ? undefined : folderId;
