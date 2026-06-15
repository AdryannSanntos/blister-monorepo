import type { FileEntry, FileFolder } from "../types/files.types";
import { FILES_ROOT_ID } from "./files-mapper";

export const isSystemFolder = (folder: FileFolder) => folder.kind === "system";

export const isAgentSystemFolder = (folder: FileFolder) =>
  folder.kind === "system" && Boolean(folder.systemKey?.startsWith("agent:"));

export const isRootFolder = (folder: FileFolder) => folder.id === FILES_ROOT_ID;

export const canRenameFolder = (folder: FileFolder) => folder.kind === "user";

export const canDeleteFolder = (folder: FileFolder, itemCount: number) =>
  folder.kind === "user" && itemCount === 0;

export const resolveUploadFolderId = (
  folderId: string,
  folders: FileFolder[],
) => {
  const current = folders.find((folder) => folder.id === folderId);
  if (!current) return folderId;
  if (isRootFolder(current)) {
    // Manual uploads never land in an agent folder; prefer a user folder.
    return folders.find((folder) => folder.kind === "user")?.id ?? folderId;
  }
  return folderId;
};

export const canCreateFolderIn = (folder: FileFolder) => {
  if (isRootFolder(folder)) return true;
  if (isAgentSystemFolder(folder)) return false;
  return folder.kind === "user";
};

export const canUploadTo = (folder: FileFolder) => {
  // Root sends to the default "Uploads" folder; agent/system folders only hold
  // agent-generated files, so manual uploads are not allowed there.
  if (isRootFolder(folder)) return true;
  if (isSystemFolder(folder)) return false;
  return folder.kind === "user";
};

export const canRenameFile = (file: FileEntry) => file.origin !== "agent_run";

export const canDeleteFile = (file: FileEntry) => file.origin !== "agent_run";
