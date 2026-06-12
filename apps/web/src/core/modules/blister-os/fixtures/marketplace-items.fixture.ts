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

export const MARKETPLACE_ITEMS: MarketplaceItem[] = [
  {
    id: "es-corte-seco",
    type: "edit-style",
    name: "Corte Seco",
    author: "Blister Studio",
    price: 0,
    flag: "destaque",
    description:
      "Ritmo acelerado, zooms pontuais e legendas grandes palavra a palavra. Feito para prender retenção nos 3 primeiros segundos.",
    palette: ["#1b1b22", "#8b7cff", "#f0f0f4"],
    specs: {
      pace: "Rápido · cortes a cada 1,8s",
      captions: "Palavra a palavra, caixa alta",
      transitions: "Zoom punch + J-cut",
      formats: "9:16 · 1:1",
    },
    includes: [
      "Preset de legendas animadas",
      "Curva de zoom (3 intensidades)",
      "SFX de transição (12 sons)",
      "Regras de enquadramento de fala",
    ],
  },
  {
    id: "es-documental",
    type: "edit-style",
    name: "Documental",
    author: "Blister Studio",
    price: 0,
    description:
      "Respiro entre falas, lower-thirds discretos e correção de cor quente. Para conteúdo de autoridade e storytelling longo.",
    palette: ["#241d18", "#c98f4e", "#f2e9dd"],
    specs: {
      pace: "Calmo · cortes a cada 6s",
      captions: "Frase inteira, serifada",
      transitions: "Crossfade suave",
      formats: "16:9 · 9:16",
    },
    includes: [
      "Lower-thirds editoriais",
      "LUT quente (2 variações)",
      "Trilha ambiente sugerida",
      "Cartões de capítulo",
    ],
  },
  {
    id: "es-podcast-pop",
    type: "edit-style",
    name: "Podcast Pop",
    author: "Mari Lobo",
    price: 120,
    flag: "novo",
    description:
      "Multicâmera simulada, reframe automático em quem fala e legendas com destaque de palavras-chave em cor.",
    palette: ["#101820", "#3fc9b5", "#f06ba8"],
    specs: {
      pace: "Médio · troca de câmera a cada 4s",
      captions: "Keyword highlight",
      transitions: "Corte direto",
      formats: "9:16 · 1:1 · 16:9",
    },
    includes: [
      "Layout de 2 e 3 participantes",
      "Reframe por voz ativa",
      "Pacote de stickers de reação",
      "Vinheta de abertura",
    ],
  },
  {
    id: "tp-lancamento",
    type: "template",
    name: "Roteiro de Lançamento",
    author: "Blister Studio",
    price: 0,
    description:
      "Sequência de 12 conteúdos para a semana de lançamento: aquecimento, abertura e fechamento de carrinho.",
    palette: ["#1a141f", "#8b7cff", "#3fc9b5"],
  },
  {
    id: "pk-neon-noir",
    type: "pack",
    name: "Pack Neon Noir",
    author: "Caio Duarte",
    price: 200,
    flag: "destaque",
    description:
      "40 texturas, 12 molduras e 8 LUTs em tons profundos com acentos elétricos.",
    palette: ["#0d0d14", "#6e5bf6", "#f06ba8"],
  },
  {
    id: "agent-planning",
    type: "agent",
    name: "Planejar conteúdo",
    author: "Blister Studio",
    price: 0,
    description: "Monta calendário e sequência de conteúdos antes da produção.",
    palette: ["#1a141f", "#8b7cff", "#3fc9b5"],
    agentId: "planning",
  },
  {
    id: "agent-script",
    type: "agent",
    name: "Escrever roteiro",
    author: "Blister Studio",
    price: 80,
    description: "Roteiros, falas e CTAs na voz do workspace.",
    palette: ["#141419", "#9d9dac", "#f0f0f4"],
    agentId: "script",
  },
  {
    id: "agent-thumbnail",
    type: "agent",
    name: "Criar thumbnail",
    author: "Blister Studio",
    price: 100,
    flag: "novo",
    description: "Capas e frames de destaque usando packs da biblioteca.",
    palette: ["#101820", "#3fc9b5", "#f06ba8"],
    agentId: "thumbnail",
  },
  {
    id: "ps-carrossel-minimal",
    type: "post-style",
    name: "Carrossel Minimal",
    author: "Blister Studio",
    price: 0,
    flag: "novo",
    description:
      "Layouts limpos para carrosséis de Instagram com tipografia forte e blocos modulares.",
    palette: ["#15151d", "#ffffff", "#8b7cff"],
    includes: [
      "6 layouts 4:5",
      "Variações de capa e CTA",
      "Tokens de cor editáveis",
    ],
  },
  {
    id: "ps-quote-bold",
    type: "post-style",
    name: "Quote Bold",
    author: "Mari Lobo",
    price: 60,
    description: "Posts de citação com contraste alto e hierarquia editorial.",
    palette: ["#111827", "#f59e0b", "#f3f4f6"],
  },
  {
    id: "as-sfx-pack",
    type: "asset",
    name: "SFX Social Pack",
    author: "Caio Duarte",
    price: 0,
    description: "Coleção de transições, whooshes e hits curtos para Reels e Shorts.",
    palette: ["#0f172a", "#22d3ee", "#e2e8f0"],
    includes: ["18 efeitos sonoros", "3 vinhetas", "Guia de uso por plataforma"],
  },
  {
    id: "as-sticker-reactions",
    type: "asset",
    name: "Stickers de Reação",
    author: "Blister Studio",
    price: 45,
    description: "Stickers animáveis para reforçar punchlines e CTAs em vídeos verticais.",
    palette: ["#1f1147", "#f06ba8", "#fef08a"],
  },
];

export const INITIAL_OWNED: Record<string, "redeemed" | "purchased"> = {
  "es-corte-seco": "redeemed",
  "tp-lancamento": "redeemed",
};

export const formatMarketplacePrice = (price: number) =>
  price === 0 ? "Grátis" : `${price} créditos`;
