import type { PrismaClient } from '@company-os/db';

/** Public path served by apps/web `public/` — keep in sync with generate-style-previews.ts */
export const textStylePreviewPath = (slug: string) =>
  `/marketplace/styles/${slug}-preview.mp4`;

/**
 * Marketplace catalog — only items backed by real product assets.
 *
 * - TEXT_STYLE: Remotion compositions in `video/text-style.registry.ts`
 * - TEMPLATE: carousel templates in `agents/carousel/templates/`
 */
const MARKETPLACE_SEED = [
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
    slug: 'carousel-editorial-performance',
    type: 'TEMPLATE' as const,
    name: 'Editorial Performance',
    author: 'Blister Studio',
    price: 0,
    flag: 'destaque',
    description:
      'Carrossel editorial com capas dramáticas, acento laranja e barra de progresso — 1080×1350.',
    palette: ['#0a0a0a', '#ff4a0a', '#f5f5f0'],
    specs: {
      templateId: 'editorial-performance',
      previewAspectRatio: '4:5',
    },
    includes: [
      'Capa full-bleed + slides texto/imagem',
      'Variações por tipo de slide',
      'Suporte a múltiplas imagens por slide',
    ],
    refId: 'editorial-performance',
  },
  {
    slug: 'carousel-minimal-clean',
    type: 'TEMPLATE' as const,
    name: 'Minimal Clean',
    author: 'Blister Studio',
    price: 0,
    description: 'Layout minimalista com tipografia bold — quadrado 1080×1080.',
    palette: ['#0a0a0a', '#f9f9f7', '#ffffff'],
    specs: {
      templateId: 'minimal-clean',
      previewAspectRatio: '1:1',
    },
    includes: ['Abertura, texto, texto+imagem e imagem', '3 variações de texto'],
    refId: 'minimal-clean',
  },
] as const;

const MARKETPLACE_SEED_SLUGS = MARKETPLACE_SEED.map((item) => item.slug);

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

  const deactivated = await prisma.marketplaceItem.updateMany({
    where: { slug: { notIn: [...MARKETPLACE_SEED_SLUGS] } },
    data: { isActive: false },
  });

  console.log(`  • ${MARKETPLACE_SEED.length} itens ativos`);
  if (deactivated.count > 0) {
    console.log(`  • ${deactivated.count} itens legados desativados`);
  }
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
