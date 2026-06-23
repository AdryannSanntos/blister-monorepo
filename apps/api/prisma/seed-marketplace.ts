import type { PrismaClient } from '@company-os/db';

/** Public path served by apps/web `public/` — keep in sync with generate-style-previews.ts */
export const textStylePreviewPath = (slug: string) =>
  `/marketplace/styles/${slug}-preview.mp4`;

const MARKETPLACE_SEED = [
  {
    slug: 'es-corte-seco',
    type: 'EDIT_STYLE' as const,
    name: 'Corte Seco',
    author: 'Blister Studio',
    price: 0,
    flag: 'destaque',
    description:
      'Ritmo acelerado, zooms pontuais e legendas grandes palavra a palavra.',
    palette: ['#1b1b22', '#8b7cff', '#f0f0f4'],
    specs: {
      pace: 'Rápido · cortes a cada 1,8s',
      captions: 'Palavra a palavra, caixa alta',
      transitions: 'Zoom punch + J-cut',
      formats: '9:16 · 1:1',
    },
    includes: [
      'Preset de legendas animadas',
      'Curva de zoom (3 intensidades)',
      'SFX de transição (12 sons)',
    ],
    refId: null,
  },
  {
    slug: 'es-documental',
    type: 'EDIT_STYLE' as const,
    name: 'Documental',
    author: 'Blister Studio',
    price: 0,
    description: 'Respiro entre falas, lower-thirds discretos e correção quente.',
    palette: ['#241d18', '#c98f4e', '#f2e9dd'],
    specs: {
      pace: 'Calmo · cortes a cada 6s',
      captions: 'Frase inteira, serifada',
      transitions: 'Crossfade suave',
      formats: '16:9 · 9:16',
    },
    includes: ['Lower-thirds editoriais', 'LUT quente (2 variações)'],
    refId: null,
  },
  {
    slug: 'cs-bold-word',
    type: 'CAPTION_STYLE' as const,
    name: 'Bold Word',
    author: 'Blister Studio',
    price: 0,
    flag: 'destaque',
    description: 'Legendas palavra a palavra em caixa alta com destaque animado.',
    palette: ['#0f0f12', '#ffffff', '#8b7cff'],
    specs: {
      style: 'Palavra a palavra',
      animation: 'Pop + highlight',
      fonts: 'Sans bold',
      formats: '9:16 · 1:1',
    },
    includes: ['Preset animado', '3 cores de highlight', 'Safe area 9:16'],
    refId: null,
  },
  {
    slug: 'cs-minimal-line',
    type: 'CAPTION_STYLE' as const,
    name: 'Minimal Line',
    author: 'Blister Studio',
    price: 0,
    description: 'Frases curtas centralizadas, fundo semi-transparente.',
    palette: ['#111827', '#f9fafb', '#6b7280'],
    specs: {
      style: 'Frase inteira',
      animation: 'Fade suave',
      fonts: 'Inter medium',
      formats: '9:16 · 16:9',
    },
    includes: ['Caixa de legenda', '2 pesos tipográficos'],
    refId: null,
  },
  {
    slug: 'neon-wave',
    type: 'TEXT_STYLE' as const,
    name: 'Neon Wave',
    author: 'Blister',
    price: 0,
    flag: 'destaque',
    description: 'Glow colorido com animação de onda — ideal para entretenimento e games.',
    palette: ['#0b0b12', '#7c3aed', '#ffffff'],
    specs: {
      previewUrl: textStylePreviewPath('neon-wave'),
      animation: 'neon-wave',
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: 72,
      color: '#FFFFFF',
      shadowColor: '#7C3AED',
    },
    includes: ['Glow pulsante', 'Onda de cor no brilho', 'Safe area 9:16'],
    refId: null,
  },
  {
    slug: 'clean-split',
    type: 'TEXT_STYLE' as const,
    name: 'Clean Split',
    author: 'Blister',
    price: 0,
    description: 'Reveal por cortina (clipPath horizontal), fonte fina — lifestyle e corporativo.',
    palette: ['#111827', '#f9fafb', '#9ca3af'],
    specs: {
      previewUrl: textStylePreviewPath('clean-split'),
      animation: 'clean-split',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 60,
      color: '#F9FAFB',
    },
    includes: ['Reveal em cortina', 'Tipografia leve', 'Fundo transparente'],
    refId: null,
  },
  {
    slug: 'kinetic-bold',
    type: 'TEXT_STYLE' as const,
    name: 'Kinetic Bold',
    author: 'Blister',
    price: 0,
    flag: 'novo',
    description: 'Palavra por palavra com scale-in spring — educacional e motivacional.',
    palette: ['#0f0f12', '#ffffff', '#8b7cff'],
    specs: {
      previewUrl: textStylePreviewPath('kinetic-bold'),
      animation: 'kinetic-bold',
      fontFamily: 'Poppins, Arial Black, sans-serif',
      fontSize: 78,
      color: '#FFFFFF',
      shadowColor: '#000000',
    },
    includes: ['Spring por palavra', 'Destaque na cor do workspace', 'Karaokê word-level'],
    refId: null,
  },
  {
    slug: 'glass-blur',
    type: 'TEXT_STYLE' as const,
    name: 'Glass Blur',
    author: 'Blister',
    price: 0,
    description: 'Fundo frosted-glass translúcido atrás do texto — vlogs e talking-head.',
    palette: ['#0f172a', '#e2e8f0', '#38bdf8'],
    specs: {
      previewUrl: textStylePreviewPath('glass-blur'),
      animation: 'glass-blur',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 56,
      color: '#FFFFFF',
      bgColor: 'rgba(255,255,255,0.12)',
    },
    includes: ['Frosted glass', 'Peso médio', 'Funciona em qualquer fundo'],
    refId: null,
  },
  {
    slug: 'broadcast',
    type: 'TEXT_STYLE' as const,
    name: 'Broadcast',
    author: 'Blister',
    price: 0,
    description: 'Barra sólida deslizante estilo lower-third — notícias, entrevistas e podcasts.',
    palette: ['#0a0a0a', '#ffffff', '#ef4444'],
    specs: {
      previewUrl: textStylePreviewPath('broadcast'),
      animation: 'broadcast',
      fontFamily: 'Roboto Condensed, Arial Narrow, sans-serif',
      fontSize: 54,
      color: '#FFFFFF',
      bgColor: '#EF4444',
    },
    includes: ['Lower-third deslizante', 'Barra sólida', 'Estilo jornalístico'],
    refId: null,
  },
  {
    slug: 'agent-planning',
    type: 'AGENT' as const,
    name: 'Planejamento de Conteúdo',
    author: 'Blister',
    price: 150,
    flag: 'novo',
    description: 'Calendário editorial e pautas alinhadas ao seu nicho.',
    palette: ['#0f172a', '#6366f1', '#e2e8f0'],
    specs: { output: 'Calendário 30 dias', format: 'Brief + pautas' },
    includes: ['Calendário mensal', 'Sugestões de formato', 'CTAs por pauta'],
    refId: 'planning',
  },
  {
    slug: 'agent-script',
    type: 'AGENT' as const,
    name: 'Roteiro para Vídeo',
    author: 'Blister',
    price: 120,
    description: 'Roteiros curtos com hook, desenvolvimento e CTA.',
    palette: ['#111827', '#f59e0b', '#fef3c7'],
    specs: { output: 'Roteiro completo', duration: '30–90s' },
    includes: ['Hook (3 variações)', 'Storyboard textual', 'CTA final'],
    refId: 'script',
  },
  {
    slug: 'agent-thumbnail',
    type: 'AGENT' as const,
    name: 'Capas e Thumbnails',
    author: 'Blister',
    price: 100,
    description: 'Conceitos visuais de capa com texto e composição.',
    palette: ['#1e1b4b', '#a855f7', '#faf5ff'],
    specs: { output: '3 variantes', formats: '16:9 · 9:16' },
    includes: ['3 conceitos', 'Tipografia sugerida', 'Paleta por conceito'],
    refId: 'thumbnail',
  },
] as const;

export async function seedMarketplaceItems(prisma: PrismaClient) {
  console.log('→ Marketplace items...');

  for (const item of MARKETPLACE_SEED) {
    await prisma.marketplaceItem.upsert({
      where: { slug: item.slug },
      update: {
        type: item.type,
        name: item.name,
        author: item.author,
        price: item.price,
        flag: 'flag' in item ? item.flag : null,
        description: item.description,
        palette: item.palette,
        specs: item.specs,
        includes: item.includes,
        refId: item.refId,
        isActive: true,
      },
      create: {
        slug: item.slug,
        type: item.type,
        name: item.name,
        author: item.author,
        price: item.price,
        flag: 'flag' in item ? item.flag : null,
        description: item.description,
        palette: item.palette,
        specs: item.specs,
        includes: item.includes,
        refId: item.refId,
        isActive: true,
      },
    });
  }

  console.log(`  • ${MARKETPLACE_SEED.length} itens ativos`);
}

/** Grant every free TEXT_STYLE to the seed admin personal space for local testing. */
export async function seedFreeTextStyleEntitlements(
  prisma: PrismaClient,
  userId: string,
) {
  const personalSpace = await prisma.personalSpace.findUnique({ where: { userId } });
  if (!personalSpace) return;

  const textStyles = await prisma.marketplaceItem.findMany({
    where: { type: 'TEXT_STYLE', isActive: true, price: 0 },
  });

  for (const item of textStyles) {
    await prisma.workspaceEntitlement.upsert({
      where: {
        itemId_personalSpaceId: {
          itemId: item.id,
          personalSpaceId: personalSpace.id,
        },
      },
      create: {
        itemId: item.id,
        personalSpaceId: personalSpace.id,
        redeemedByUserId: userId,
      },
      update: {},
    });
  }

  if (textStyles.length > 0) {
    console.log(`  • ${textStyles.length} TEXT_STYLE na biblioteca do admin`);
  }
}
