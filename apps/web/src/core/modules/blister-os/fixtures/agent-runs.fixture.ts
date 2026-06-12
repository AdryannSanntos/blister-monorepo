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
    id: "run_ve_1",
    agentId: "video_editor",
    title: "Reels — lançamento bolo de cenoura",
    status: "completed",
    reviewStatus: "approved",
    createdAt: daysAgo(1, 14),
    preview: "Edição 9:16 com legendas e CTA",
    creditsUsed: 2.4,
  },
  {
    id: "run_ve_2",
    agentId: "video_editor",
    title: "Aula gravada — módulo 3",
    status: "completed",
    reviewStatus: "pending",
    createdAt: daysAgo(3, 9),
    preview: "Corte dinâmico com intro de 3s",
    creditsUsed: 3.1,
  },
  {
    id: "run_ve_3",
    agentId: "video_editor",
    title: "Depoimento cliente — versão curta",
    status: "failed",
    reviewStatus: null,
    createdAt: daysAgo(6, 16),
    preview: "Falha no upload — tentar novamente",
    creditsUsed: 0,
  },
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
  {
    id: "run_research_1",
    agentId: "research",
    title: "Tendências confeitaria — junho",
    status: "completed",
    reviewStatus: "approved",
    createdAt: daysAgo(1, 10),
    preview: "Brief com 12 referências e 3 ângulos",
    creditsUsed: 0.4,
  },
  {
    id: "run_research_2",
    agentId: "research",
    title: "Concorrentes — stories de encomenda",
    status: "completed",
    reviewStatus: "pending",
    createdAt: daysAgo(4, 15),
    preview: "Mapa de hooks e CTAs",
    creditsUsed: 0.35,
  },
  {
    id: "run_planning_1",
    agentId: "planning",
    title: "Calendário julho — lançamentos",
    status: "completed",
    reviewStatus: "approved",
    createdAt: daysAgo(2, 12),
    preview: "14 posts + 4 reels sugeridos",
    creditsUsed: 0.5,
  },
  {
    id: "run_script_1",
    agentId: "script",
    title: "Roteiro reel — promo fim de semana",
    status: "completed",
    reviewStatus: "approved",
    createdAt: daysAgo(3, 18),
    preview: "Hook + corpo + CTA WhatsApp",
    creditsUsed: 0.3,
  },
];
