export type RecentActivityEntry = {
  id: string;
  text: string;
  when: string;
  agentId: string;
};

export const RECENT_ACTIVITY_FIXTURE: RecentActivityEntry[] = [
  {
    id: "a1",
    text: "Gerador de Cortes priorizou 8 cortes do Podcast #41",
    when: "há 2 horas",
    agentId: "cuts",
  },
  {
    id: "a2",
    text: "Gerador de Cortes finalizou 5 cortes do vídeo de apresentação",
    when: "ontem",
    agentId: "cuts",
  },
];
