import type {
  CarouselIdeaOption,
  CarouselSlideContent,
  CarouselDesignPlan,
  CarouselOutput,
} from "@company-os/types";

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
    id: "run_carousel_1",
    agentId: "carousel",
    theme: "5 hábitos que vão transformar sua manhã",
    templateId: "minimal-clean",
    status: "completed",
    slidesCount: 5,
    createdAt: daysAgo(1, 14),
    creditsUsed: 2.1,
  },
  {
    id: "run_carousel_2",
    agentId: "carousel",
    theme: "Como criar conteúdo consistente sem burnout",
    templateId: "minimal-clean",
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
  templateId: "minimal-clean",
  slides: [
    {
      id: "sc_1",
      order: 1,
      type: "start",
      variationId: "v1",
      needsImage: false,
      layoutNotes:
        "Slide de abertura com título grande centralizado, fundo escuro #0a0a0a, tipografia bold 64px, subtítulo 24px com opacidade 70%.",
    },
    {
      id: "sc_2",
      order: 2,
      type: "text",
      variationId: "v2",
      needsImage: false,
      layoutNotes:
        "Número do hábito (01) em destaque no topo, título bold abaixo, corpo do texto em tamanho menor. Fundo claro com acento de cor.",
    },
    {
      id: "sc_3",
      order: 3,
      type: "text_image",
      variationId: "v1",
      needsImage: true,
      imageSlot: "foto de copo d'água",
      layoutNotes:
        "Imagem ocupando 55% superior do slide, texto na metade inferior com fundo branco. Call to action em destaque na base.",
    },
    {
      id: "sc_4",
      order: 4,
      type: "text",
      variationId: "v3",
      needsImage: false,
      layoutNotes:
        "Layout com fundo escuro contrastante. Ícone de celular riscado centralizado acima do título para reforço visual.",
    },
    {
      id: "sc_5",
      order: 5,
      type: "text_image",
      variationId: "v2",
      needsImage: true,
      imageSlot: "foto de pessoa se exercitando",
      layoutNotes:
        "Imagem à direita ocupando 40% da largura. Texto e call to action à esquerda em coluna. Badge de número do hábito no canto superior esquerdo.",
    },
  ],
};

export const CAROUSEL_OUTPUT_FIXTURE: CarouselOutput = {
  socialNetwork: "instagram",
  templateId: "minimal-clean",
  slides: [
    {
      id: "sc_1",
      order: 1,
      type: "start",
      htmlContent: `<div class="slide slide-start"><div class="slide-number">01</div><h1>5 hábitos que vão transformar sua manhã</h1><p>A maioria das pessoas subestima o poder das primeiras horas do dia.</p></div>`,
      cssContent: `.slide{width:1080px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0a0a0a;padding:64px;box-sizing:border-box;font-family:system-ui,sans-serif}.slide-start h1{font-size:56px;font-weight:900;color:#fff;text-align:center;line-height:1.1;margin:16px 0}.slide-start p{font-size:22px;color:rgba(255,255,255,.65);text-align:center}`,
    },
    {
      id: "sc_2",
      order: 2,
      type: "text",
      htmlContent: `<div class="slide slide-text"><span class="habit-number">01</span><h2>Acorde 30 minutos mais cedo</h2><p>Não para fazer mais — para ter tempo sem pressa. Esse espaço muda tudo.</p></div>`,
      cssContent: `.slide{width:1080px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f9f9f7;padding:72px;box-sizing:border-box;font-family:system-ui,sans-serif}.habit-number{font-size:80px;font-weight:900;color:#e8e8e4;line-height:1}.slide-text h2{font-size:48px;font-weight:800;color:#111;text-align:center;margin:8px 0}.slide-text p{font-size:22px;color:#555;text-align:center;line-height:1.5}`,
    },
    {
      id: "sc_3",
      order: 3,
      type: "text_image",
      htmlContent: `<div class="slide slide-text-image"><div class="image-area" style="background:#dbeafe"></div><div class="text-area"><h2>Hidrate-se antes do café</h2><p>Seu corpo passa 8 horas sem água. Um copo simples aumenta o nível de energia em até 30%.</p><span class="cta">Simples assim.</span></div></div>`,
      cssContent: `.slide{width:1080px;height:1080px;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;box-sizing:border-box}.image-area{height:55%;width:100%}.text-area{flex:1;display:flex;flex-direction:column;justify-content:center;padding:40px}.slide-text-image h2{font-size:40px;font-weight:800;color:#111;margin:0 0 12px}.slide-text-image p{font-size:20px;color:#444;line-height:1.5;margin:0 0 16px}.cta{font-size:18px;font-weight:700;color:#2563eb}`,
    },
    {
      id: "sc_4",
      order: 4,
      type: "text",
      htmlContent: `<div class="slide slide-text-dark"><span class="habit-number">04</span><h2>Evite o celular nos primeiros 20 minutos</h2><p>Checar notificações logo cedo coloca seu cérebro em modo reativo. Comece no seu ritmo.</p></div>`,
      cssContent: `.slide{width:1080px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1c1c1e;padding:72px;box-sizing:border-box;font-family:system-ui,sans-serif}.habit-number{font-size:80px;font-weight:900;color:rgba(255,255,255,.1);line-height:1}.slide-text-dark h2{font-size:44px;font-weight:800;color:#fff;text-align:center;margin:8px 0}.slide-text-dark p{font-size:22px;color:rgba(255,255,255,.65);text-align:center;line-height:1.5}`,
    },
    {
      id: "sc_5",
      order: 5,
      type: "text_image",
      htmlContent: `<div class="slide slide-split"><div class="text-col"><span class="habit-number">05</span><h2>Mova o corpo, mesmo que por 10 minutos</h2><p>Uma caminhada curta, alongamento ou 5 minutos de respiração.</p><span class="cta">Seu futuro eu agradece.</span></div><div class="image-col" style="background:#dcfce7"></div></div>`,
      cssContent: `.slide{width:1080px;height:1080px;display:flex;background:#fff;font-family:system-ui,sans-serif;box-sizing:border-box}.text-col{flex:1;display:flex;flex-direction:column;justify-content:center;padding:60px 48px}.habit-number{font-size:64px;font-weight:900;color:#e8e8e4;line-height:1}.slide-split h2{font-size:40px;font-weight:800;color:#111;margin:8px 0 12px}.slide-split p{font-size:20px;color:#444;line-height:1.5;margin:0 0 16px}.cta{font-size:18px;font-weight:700;color:#16a34a}.image-col{width:400px}`,
    },
  ],
};
