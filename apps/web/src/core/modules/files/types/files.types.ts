export type FileFolder = {
  id: string;
  name: string;
  parentId: string | null;
  kind: "system" | "user";
  systemKey?: string | null;
};

export type FileEntry = {
  id: string;
  folderId: string;
  name: string;
  duration: string | null;
  size: string;
  date: string;
  usedIn: string | null;
  kind: "video" | "doc" | "image";
  origin: "upload" | "agent_run" | "integration";
  status?: "pending" | "processing" | "indexed" | "failed";
};
