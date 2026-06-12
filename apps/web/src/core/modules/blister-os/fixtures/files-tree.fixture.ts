export type FileFolder = {
  id: string;
  name: string;
  parentId: string | null;
  kind: "system" | "user";
  systemKey?: "uploads" | "generated" | "integrations" | null;
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
};

export const FOLDERS_FIXTURE: FileFolder[] = [
  { id: "root", name: "Todos os arquivos", parentId: null, kind: "user" },
  {
    id: "f-uploads",
    name: "Uploads",
    parentId: "root",
    kind: "system",
    systemKey: "uploads",
  },
  {
    id: "f-generated",
    name: "Gerados",
    parentId: "root",
    kind: "system",
    systemKey: "generated",
  },
  {
    id: "f-integrations",
    name: "Integrações",
    parentId: "root",
    kind: "system",
    systemKey: "integrations",
  },
  { id: "f-brutos", name: "Vídeos brutos", parentId: "root", kind: "user" },
  { id: "f-podcast", name: "Podcast", parentId: "f-brutos", kind: "user" },
  { id: "f-aulas", name: "Aulas", parentId: "root", kind: "user" },
];

export const FILES_FIXTURE: FileEntry[] = [
  {
    id: "u1",
    folderId: "f-podcast",
    name: "podcast-ep41-bruto.mp4",
    duration: "1:24:08",
    size: "4,2 GB",
    date: "10 jun",
    usedIn: "Cortes — Podcast #41",
    kind: "video",
    origin: "upload",
  },
  {
    id: "u2",
    folderId: "f-aulas",
    name: "aula-modulo3-take2.mov",
    duration: "38:12",
    size: "1,8 GB",
    date: "08 jun",
    usedIn: null,
    kind: "video",
    origin: "upload",
  },
  {
    id: "u3",
    folderId: "f-uploads",
    name: "depoimento-cliente-ana.mp4",
    duration: "06:44",
    size: "412 MB",
    date: "05 jun",
    usedIn: "Lançamento Mentoria Q3",
    kind: "video",
    origin: "upload",
  },
  {
    id: "u4",
    folderId: "f-uploads",
    name: "brief-lancamento-q3.md",
    duration: null,
    size: "12 KB",
    date: "04 jun",
    usedIn: null,
    kind: "doc",
    origin: "upload",
  },
  {
    id: "g1",
    folderId: "f-generated",
    name: "corte-podcast-41-hook-01.mp4",
    duration: "00:42",
    size: "18 MB",
    date: "10 jun",
    usedIn: "Cortes — Podcast #41",
    kind: "video",
    origin: "agent_run",
  },
  {
    id: "g2",
    folderId: "f-generated",
    name: "edicao-depoimento-ana-v2.mp4",
    duration: "03:12",
    size: "96 MB",
    date: "09 jun",
    usedIn: null,
    kind: "video",
    origin: "agent_run",
  },
  {
    id: "i1",
    folderId: "f-integrations",
    name: "youtube-backup-junho.csv",
    duration: null,
    size: "4 KB",
    date: "01 jun",
    usedIn: null,
    kind: "doc",
    origin: "integration",
  },
];
