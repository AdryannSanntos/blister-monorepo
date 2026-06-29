import type {
  CarouselIdeaOption,
  CarouselSlideContent,
  CarouselDesignPlan,
  CarouselOutput,
  CarouselOutputSlide,
} from "@company-os/types";

import generatedSlides from "./carousel-output.generated.json";

const daysAgo = (days: number, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

export type CarouselRunFixture = {
  id: string;
  agentId: "carousel";
  theme: string;
  templateId: string;
  status: "completed" | "running" | "failed" | "paused";
  slidesCount: number;
  createdAt: string;
  creditsUsed?: number;
};

export const CAROUSEL_RUNS_FIXTURE: CarouselRunFixture[] = [
  {
    id: "run_carousel_preview",
    agentId: "carousel",
    theme: "Preview — novo carrossel",
    templateId: "editorial-performance",
    status: "paused",
    slidesCount: 5,
    createdAt: daysAgo(0, 11),
    creditsUsed: 0,
  },
  {
    id: "run_carousel_1",
    agentId: "carousel",
    theme: "5 hábitos que vão transformar sua manhã",
    templateId: "editorial-performance",
    status: "completed",
    slidesCount: 5,
    createdAt: daysAgo(1, 14),
    creditsUsed: 2.1,
  },
  {
    id: "run_carousel_2",
    agentId: "carousel",
    theme: "Como criar conteúdo consistente sem burnout",
    templateId: "editorial-performance",
    status: "paused",
    slidesCount: 7,
    createdAt: daysAgo(0, 9),
    creditsUsed: 0.8,
  },
];

export const CAROUSEL_IDEAS_FIXTURE: CarouselIdeaOption[] = [
  {
    id: "idea_1",
    title: "5 hábitos que vão transformar sua manhã",
    description:
      "Um guia prático com rotinas matinais simples que qualquer pessoa pode adotar para começar o dia com mais foco e energia.",
  },
  {
    id: "idea_2",
    title: "Por que você está se sabotando sem perceber",
    description:
      "Comportamentos inconscientes que impedem o crescimento pessoal e como identificá-los na sua rotina diária.",
  },
  {
    id: "idea_3",
    title: "O método simples para parar de procrastinar",
    description:
      "Técnica de 2 minutos adaptada para criadores de conteúdo que sempre deixam tarefas importantes para depois.",
  },
  {
    id: "idea_4",
    title: "Como pessoas produtivas usam o tempo livre",
    description:
      "O que os mais produtivos fazem nos momentos de descanso que a maioria das pessoas ignora completamente.",
  },
  {
    id: "idea_5",
    title: "Erros que iniciantes cometem (e como evitar)",
    description:
      "Os 5 erros mais comuns de quem está começando e as correções simples que fazem toda a diferença.",
  },
];

export const CAROUSEL_SLIDE_CONTENTS_FIXTURE: CarouselSlideContent[] = [
  {
    id: "sc_1",
    order: 1,
    type: "start",
    title: "5 hábitos que vão transformar sua manhã",
    body: "A maioria das pessoas subestima o poder das primeiras horas do dia.",
  },
  {
    id: "sc_2",
    order: 2,
    type: "text",
    title: "Acorde 30 minutos mais cedo",
    body: "Não para fazer mais — para ter tempo sem pressa. Esse espaço muda tudo.",
  },
  {
    id: "sc_3",
    order: 3,
    type: "text_image",
    title: "Hidrate-se antes do café",
    body: "Seu corpo passa 8 horas sem água. Um copo simples aumenta o nível de energia em até 30%.",
    callToAction: "Simples assim.",
  },
  {
    id: "sc_4",
    order: 4,
    type: "text",
    title: "Evite o celular nos primeiros 20 minutos",
    body: "Checar notificações logo cedo coloca seu cérebro em modo reativo. Comece no seu ritmo.",
  },
  {
    id: "sc_5",
    order: 5,
    type: "text_image",
    title: "Mova o corpo, mesmo que por 10 minutos",
    body: "Uma caminhada curta, alongamento ou 5 minutos de respiração. Ativa o corpo e a mente.",
    callToAction: "Seu futuro eu agradece.",
  },
];

export const CAROUSEL_DESIGN_PLAN_FIXTURE: CarouselDesignPlan = {
  templateId: "editorial-performance",
  slides: [
    {
      id: "sc_1",
      order: 1,
      type: "start",
      variationId: "v1",
      imageSlots: [
        { slotKey: "image_url", label: "Foto de capa", required: true },
      ],
      layoutNotes:
        "slide_start — hero full-bleed com overlay escuro, badge @creator, headline condensada no terço inferior e barra de progresso.",
    },
    {
      id: "sc_2",
      order: 2,
      type: "text_image",
      variationId: "v1",
      imageSlots: [
        { slotKey: "image_url", label: "Screenshot de prova", required: true },
      ],
      layoutNotes:
        "slide_text_image escuro — headline, explicação, card branco com screenshot, fechamento textual.",
    },
    {
      id: "sc_3",
      order: 3,
      type: "text",
      variationId: "v1",
      imageSlots: [],
      layoutNotes:
        "slide_text laranja — divisor de framework com lista em setas e frase final em branco.",
    },
    {
      id: "sc_4",
      order: 4,
      type: "text_image",
      variationId: "v3",
      imageSlots: [
        { slotKey: "image_url", label: "Miniatura 1", required: true },
        { slotKey: "image_url_2", label: "Miniatura 2", required: true },
        { slotKey: "image_url_3", label: "Miniatura 3", required: false },
      ],
      layoutNotes:
        "Faixa superior com thumbnails + headline + checklist verde sobre fundo off-white.",
    },
    {
      id: "sc_5",
      order: 5,
      type: "text",
      variationId: "v3",
      imageSlots: [],
      layoutNotes:
        "slide_cta — dois parágrafos, box central com palavra-chave gigante em laranja e assinatura.",
    },
  ],
};

export const CAROUSEL_OUTPUT_FIXTURE: CarouselOutput = {
  socialNetwork: "instagram",
  templateId: "editorial-performance",
  slides: generatedSlides as CarouselOutputSlide[],
};
