export type ProjectFixture = {
  id: string;
  name: string;
  piecesCount: number;
  updatedAt: string;
  status: "in_progress" | "draft";
  agentIds: string[];
};

export const PROJECTS_FIXTURE: ProjectFixture[] = [
  {
    id: "project-1",
    name: "Lançamento Q2",
    piecesCount: 8,
    updatedAt: "2026-06-20T10:00:00.000Z",
    status: "in_progress",
    agentIds: ["cuts"],
  },
  {
    id: "project-2",
    name: "Série YouTube",
    piecesCount: 3,
    updatedAt: "2026-06-18T15:30:00.000Z",
    status: "draft",
    agentIds: ["cuts", "planning"],
  },
];
