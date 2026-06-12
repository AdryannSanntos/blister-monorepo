export type RecentActivityEntry = {
  id: string;
  text: string;
  when: string;
  agentId: string;
};

export const RECENT_ACTIVITY_FIXTURE: RecentActivityEntry[] = [
  {
    id: "a1",
    text: 'Editor de Vídeo finalizou "Depoimento Ana — v2" com o estilo Corte Seco',
    when: "há 40 min",
    agentId: "video_editor",
  },
  {
    id: "a2",
    text: "Gerador de Cortes priorizou 8 cortes do Podcast #41",
    when: "há 2 horas",
    agentId: "cuts",
  },
  {
    id: "a3",
    text: "Escrever roteiro entregou 3 roteiros do lançamento para revisão",
    when: "ontem",
    agentId: "script",
  },
];
