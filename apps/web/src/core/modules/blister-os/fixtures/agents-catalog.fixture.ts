import type { LucideIcon } from "lucide-react";
import {
  Clapperboard,
  Compass,
  PenLine,
  Scissors,
  Shapes,
  Sparkles,
} from "lucide-react";

export type AgentTier = "default" | "marketplace";

export type AgentCatalogEntry = {
  id: string;
  name: string;
  description: string;
  stat: string;
  tier: AgentTier;
  icon: LucideIcon;
  routeSlug: string;
};

export const AGENTS_CATALOG: AgentCatalogEntry[] = [
  {
    id: "video_editor",
    name: "Editor de Vídeo",
    description:
      "Faça upload de um vídeo, aplique um Edit Style da sua biblioteca e receba a edição pronta.",
    stat: "12 edições este mês",
    tier: "default",
    icon: Clapperboard,
    routeSlug: "video-editor",
  },
  {
    id: "cuts",
    name: "Gerador de Cortes",
    description:
      "Transforme lives, podcasts e aulas longas em cortes curtos priorizados por potencial de retenção.",
    stat: "38 cortes gerados",
    tier: "default",
    icon: Scissors,
    routeSlug: "cuts",
  },
  {
    id: "research",
    name: "Pesquisar",
    description:
      "Briefing, tendências e referências para o seu próximo conteúdo, com contexto do workspace.",
    stat: "6 briefings esta semana",
    tier: "default",
    icon: Sparkles,
    routeSlug: "research",
  },
  {
    id: "planning",
    name: "Planejar conteúdo",
    description: "Monta calendário e sequência de conteúdos antes da produção.",
    stat: "Plano de junho ativo",
    tier: "marketplace",
    icon: Compass,
    routeSlug: "planning",
  },
  {
    id: "script",
    name: "Escrever roteiro",
    description: "Roteiros, falas e CTAs na voz do workspace.",
    stat: "9 roteiros esta semana",
    tier: "marketplace",
    icon: PenLine,
    routeSlug: "script",
  },
  {
    id: "thumbnail",
    name: "Criar thumbnail",
    description: "Capas e frames de destaque usando packs da biblioteca.",
    stat: "5 thumbs em revisão",
    tier: "marketplace",
    icon: Shapes,
    routeSlug: "thumbnail",
  },
];

export const DEFAULT_AGENT_IDS = ["cuts", "video_editor", "research"] as const;

export const getAgentById = (id: string) =>
  AGENTS_CATALOG.find((agent) => agent.id === id);

export const getAgentByRouteSlug = (slug: string) =>
  AGENTS_CATALOG.find((agent) => agent.routeSlug === slug);
