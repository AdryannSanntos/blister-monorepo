import type { MarketplaceItem } from "../types/marketplace";

export const MARKETPLACE_TYPES = [
  { id: "all", label: "Todos" },
  { id: "edit-style", label: "Edit Styles" },
  { id: "post-style", label: "Post Styles" },
  { id: "caption-style", label: "Estilos de legenda" },
  { id: "pack", label: "Packs visuais" },
  { id: "template", label: "Templates" },
  { id: "asset", label: "Assets criativos" },
  { id: "agent", label: "Agentes" },
] as const;

export const MARKETPLACE_TYPE_LABELS: Record<string, string> = {
  "edit-style": "Edit Style",
  "post-style": "Post Style",
  "caption-style": "Estilo de legenda",
  pack: "Pack visual",
  template: "Template",
  asset: "Asset criativo",
  agent: "Agente",
};

// Marketplace propositalmente vazio: o produto expõe apenas o agente de cortes.
// Catálogo de estilos/packs/agentes voltará em fase futura.
export const MARKETPLACE_ITEMS: MarketplaceItem[] = [];

export const INITIAL_OWNED: Record<string, "redeemed" | "purchased"> = {};

export const formatMarketplacePrice = (price: number) =>
  price === 0 ? "Grátis" : `${price} créditos`;
