import { normalizeBrandPalette } from '@company-os/types';

import { formatContextPackForPrompt } from '../../context/formatters';
import type { BrandProfile, ContextPack } from '@company-os/agent-sdk';
import type { ResolvedAsset } from '../assets';
import type { PostBrief } from '../onboarding';

export function formatBrandPaletteForPrompt(palette: BrandProfile['palette']): string {
  const normalized = normalizeBrandPalette(palette);
  const lines: string[] = [];

  const describe = (role: string, color: { name: string; hex: string }): void => {
    const name = color.name?.trim() ? ` (${color.name.trim()})` : '';
    lines.push(`- ${role}: ${color.hex}${name}`);
  };

  describe('Cor primária', normalized.primary);
  describe('Cor secundária', normalized.secondary);
  normalized.additional.forEach((color, index) => {
    describe(`Cor adicional ${index + 1}`, color);
  });

  return lines.join('\n');
}

export function formatBrandIdentityForPrompt(profile: BrandProfile | null): string {
  if (!profile) {
    return [
      'Nenhum perfil de marca cadastrado no Cérebro da Marca.',
      'Use somente o briefing do usuário e o contexto recuperado (RAG) para planejar.',
      'Não invente estilo visual genérico (editorial, minimalista, etc.) sem base nos dados.',
    ].join(' ');
  }

  const lines: string[] = [];
  if (profile.niche) lines.push(`Nicho: ${profile.niche}`);
  if (profile.description) lines.push(`Descrição: ${profile.description}`);
  if (profile.brandVoice) lines.push(`Tom de voz: ${profile.brandVoice}`);
  if (profile.targetAudience) lines.push(`Público-alvo: ${profile.targetAudience}`);
  if (profile.marketingObjective)
    lines.push(`Objetivo de marketing: ${profile.marketingObjective}`);
  if (profile.mainProducts) lines.push(`Produtos/serviços: ${profile.mainProducts}`);
  if (profile.differentiators) lines.push(`Diferenciais: ${profile.differentiators}`);
  if (profile.visualStyle) {
    lines.push(
      `Estilo visual da marca (OBRIGATÓRIO — base de toda decisão estética): ${profile.visualStyle}`,
    );
  } else {
    lines.push(
      'Estilo visual da marca: não cadastrado — derive a direção visual apenas de tom de voz, nicho e contexto RAG.',
    );
  }

  return lines.join('\n');
}

export function formatBrandTypographyForPlanning(profile: BrandProfile | null): string {
  const typography = profile?.typography?.trim();

  if (!typography) {
    return [
      'Nenhuma tipografia cadastrada no Cérebro da Marca.',
      'Escolha UMA família Google Fonts coerente com o estilo visual e nicho da marca.',
      'Proibido Arial, Helvetica, Inter, Roboto ou pilhas genéricas.',
    ].join(' ');
  }

  return [
    `Tipografia da marca (OBRIGATÓRIA em todo o plano e execução): ${typography}`,
    'Não proponha fontes alternativas sem justificativa explícita ligada ao briefing.',
  ].join(' ');
}

export function formatBrandAssetsForPrompt(assets: ResolvedAsset[]): string {
  if (assets.length === 0) {
    return [
      'Sem imagens da marca disponíveis.',
      'Planeje composição tipográfica com cor sólida da paleta — sem fotos externas ou placeholders.',
    ].join(' ');
  }

  return assets.map((asset) => `- ${asset.label}: ${asset.url}`).join('\n');
}

export function formatPostBriefForPrompt(brief: PostBrief): string {
  const slideWord = brief.slidesCount === 1 ? 'slide' : 'slides';

  return [
    '## Respostas do usuário (use somente estas especificações técnicas)',
    `- Rede social: ${brief.platformLabel}`,
    `- Formato: ${brief.format === 'carousel' ? 'Carrossel' : 'Imagem única'}`,
    `- Quantidade: ${brief.slidesCount} ${slideWord}`,
    `- Canvas: ${brief.width}x${brief.height}px`,
    `- Objetivo do post: ${brief.objectiveLabel}`,
  ].join('\n');
}

export function formatAllowedContextSources(
  brandProfile: BrandProfile | null,
  contextPack: ContextPack,
): string {
  const sections: string[] = [
    '## Fontes permitidas (OBRIGATÓRIO)',
    '1. Pedido do usuário (userInput)',
    '2. Respostas do onboarding (rede, formato, slides, objetivo)',
    '3. Cérebro da Marca (perfil cadastrado)',
    '4. Contexto recuperado via RAG (marca, aprendizados, campanha)',
    '5. Imagens da marca listadas abaixo',
    '',
    'PROIBIDO: inventar estilo, tom, público ou preferências que não estejam nessas fontes.',
    'PROIBIDO: usar estilos genéricos de mercado (editorial, premium, clean) se conflitarem com o estilo visual da marca.',
  ];

  const ragContext = formatContextPackForPrompt(contextPack);
  if (ragContext) {
    sections.push(ragContext);
  }

  if (brandProfile?.visualStyle?.trim()) {
    sections.push(
      `## Estilo visual da empresa (prioridade máxima)\n${brandProfile.visualStyle.trim()}`,
    );
  }

  return sections.join('\n');
}
