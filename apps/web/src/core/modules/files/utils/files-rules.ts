import type { FileEntry, FileFolder } from "../types/files.types";
import { FILES_ROOT_ID } from "./files-mapper";

export const isSystemFolder = (folder: FileFolder) => folder.kind === "system";

export const isRootFolder = (folder: FileFolder) => folder.id === FILES_ROOT_ID;

export const canRenameFolder = (_folder: FileFolder) => false;

export const canDeleteFolder = (folder: FileFolder, itemCount: number) =>
  folder.kind === "user" && itemCount === 0;

export const resolveUploadFolderId = (
  folderId: string,
  folders: FileFolder[],
) => {
  const current = folders.find((folder) => folder.id === folderId);
  if (!current) return folderId;
  if (isRootFolder(current)) {
    return folders.find((folder) => folder.systemKey === "uploads")?.id ?? folderId;
  }
  return folderId;
};

export const canCreateFolderIn = (folder: FileFolder) => {
  if (isRootFolder(folder)) return true;
  if (folder.kind === "system" && folder.systemKey !== "uploads") return false;
  return true;
};

export const canUploadTo = (folder: FileFolder) => {
  if (isRootFolder(folder)) return true;
  if (folder.kind === "system" && folder.systemKey !== "uploads") return false;
  return true;
};

export const canRenameFile = (file: FileEntry) => file.origin !== "agent_run";

export const canDeleteFile = (file: FileEntry) => file.origin !== "agent_run";
