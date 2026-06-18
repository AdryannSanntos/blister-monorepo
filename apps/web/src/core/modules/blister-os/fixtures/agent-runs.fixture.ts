export type AgentRunStatus = "completed" | "running" | "failed" | "queued";

export type AgentRunReviewStatus = "approved" | "pending" | "rejected" | null;

export type AgentRunFixture = {
  id: string;
  agentId: string;
  title: string;
  status: AgentRunStatus;
  reviewStatus: AgentRunReviewStatus;
  createdAt: string;
  preview?: string;
  creditsUsed?: number;
};

const daysAgo = (days: number, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

export const AGENT_RUNS_FIXTURE: AgentRunFixture[] = [
  {
    id: "run_cuts_1",
    agentId: "cuts",
    title: "Podcast ep. 41 — melhores momentos",
    status: "completed",
    reviewStatus: "approved",
    createdAt: daysAgo(0, 11),
    preview: "8 cortes priorizados por retenção",
    creditsUsed: 1.8,
  },
  {
    id: "run_cuts_2",
    agentId: "cuts",
    title: "Live Instagram — highlights",
    status: "completed",
    reviewStatus: "approved",
    createdAt: daysAgo(2, 20),
    preview: "5 cortes verticais prontos",
    creditsUsed: 1.5,
  },
  {
    id: "run_cuts_3",
    agentId: "cuts",
    title: "Aula longa — gancho inicial",
    status: "running",
    reviewStatus: null,
    createdAt: daysAgo(0, 8),
    preview: "Analisando segmentos…",
    creditsUsed: 0.6,
  },
];
