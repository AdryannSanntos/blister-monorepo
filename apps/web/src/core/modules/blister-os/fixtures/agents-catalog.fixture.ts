import type { LucideIcon } from "lucide-react";
import { GalleryHorizontal, Scissors } from "lucide-react";

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

// Único agente operacional do produto. Os demais (video_editor, research,
// planning, script, thumbnail) seguem no roadmap mas não são expostos na UI.
export const AGENTS_CATALOG: AgentCatalogEntry[] = [
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
    id: "carousel",
    name: "Carrossel",
    description:
      "Transforme um tema em slides prontos para postar no Instagram, com design profissional e conteúdo otimizado.",
    stat: "0 carrosséis gerados",
    tier: "default",
    icon: GalleryHorizontal,
    routeSlug: "carousel",
  },
];

export const DEFAULT_AGENT_IDS = ["cuts", "carousel"] as const;

export const getAgentById = (id: string) =>
  AGENTS_CATALOG.find((agent) => agent.id === id);

export const getAgentByRouteSlug = (slug: string) =>
  AGENTS_CATALOG.find((agent) => agent.routeSlug === slug);
