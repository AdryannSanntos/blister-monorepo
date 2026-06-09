import { normalizeBrandPalette } from '@company-os/types';

import { formatContextPackForPrompt } from '../../runtime/kernel/step-context.builder';
import type { BrandProfile, ContextPack } from '../../runtime/kernel/types';
import type { ResolvedAsset } from '../assets';
import type { PostBrief } from '../onboarding';
import { formatPostAgentSkillsForPrompt } from '../skills';

function formatPalette(palette: BrandProfile['palette']): string {
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

function formatBrandIdentity(profile: BrandProfile | null): string {
  if (!profile) {
    return 'Nenhum perfil de marca disponível. Planeje um visual neutro, profissional e editorial.';
  }

  const lines: string[] = [];
  if (profile.niche) lines.push(`Nicho: ${profile.niche}`);
  if (profile.description) lines.push(`Descrição: ${profile.description}`);
  if (profile.brandVoice) lines.push(`Tom de voz: ${profile.brandVoice}`);
  if (profile.targetAudience) lines.push(`Público-alvo: ${profile.targetAudience}`);
  if (profile.mainProducts) lines.push(`Produtos/serviços: ${profile.mainProducts}`);
  if (profile.differentiators) lines.push(`Diferenciais: ${profile.differentiators}`);
  if (profile.visualStyle) lines.push(`Estilo visual: ${profile.visualStyle}`);

  return lines.join('\n');
}

function formatBrandTypography(profile: BrandProfile | null): string {
  const typography = profile?.typography?.trim();

  if (!typography) {
    return [
      'Nenhuma tipografia cadastrada.',
      'No plano, escolha UMA família Google Fonts coerente com nicho e estilo visual — e use-a em todos os slides.',
      'Proibido Arial, Helvetica, Inter, Roboto ou pilhas genéricas.',
    ].join(' ');
  }

  return [
    `Tipografia da marca (OBRIGATÓRIA em todo o plano e execução): ${typography}`,
    'Não proponha fontes alternativas sem justificativa forte ligada ao briefing.',
  ].join(' ');
}

function formatAssets(assets: ResolvedAsset[]): string {
  if (assets.length === 0) {
    return [
      'Sem imagens da marca disponíveis.',
      'Planeje composição tipográfica com cor sólida da paleta — sem fotos externas ou placeholders.',
    ].join(' ');
  }

  return assets.map((asset) => `- ${asset.label}: ${asset.url}`).join('\n');
}

/**
 * System prompt for the design planning step. The model must internalize the
 * blister-social-post-uiux skill and output a detailed, actionable plan before
 * any HTML is generated.
 */
export function buildPlanDesignSystemPrompt(
  brandProfile: BrandProfile | null,
  contextPack: ContextPack,
  brief: PostBrief,
  assets: ResolvedAsset[],
): string {
  const sections: string[] = [];

  sections.push(
    [
      'Você é diretor de arte e UI designer sênior especializado em posts para redes sociais.',
      'Sua tarefa NESTE passo é APENAS planejar a composição visual — não gere HTML.',
      'Leia a skill abaixo com atenção e produza um plano profissional, específico e executável.',
    ].join(' '),
  );

  const skillsPrompt = formatPostAgentSkillsForPrompt();
  if (skillsPrompt) {
    sections.push(`## Skill obrigatória (base de todas as decisões)\n${skillsPrompt}`);
  }

  sections.push(`## Identidade da marca\n${formatBrandIdentity(brandProfile)}`);
  sections.push(`## Tipografia da marca\n${formatBrandTypography(brandProfile)}`);

  if (brandProfile) {
    sections.push(
      `## Paleta (use somente estas cores)\n${formatPalette(brandProfile.palette)}`,
    );
  }

  sections.push(`## Imagens disponíveis\n${formatAssets(assets)}`);

  const brandContext = formatContextPackForPrompt(contextPack);
  if (brandContext) {
    sections.push(brandContext);
  }

  const slideWord = brief.slidesCount === 1 ? 'slide' : 'slides';
  sections.push(
    [
      '## Especificações do post',
      `- Rede: ${brief.platformLabel}`,
      `- Formato: ${brief.format === 'carousel' ? 'Carrossel' : 'Imagem única'}`,
      `- Quantidade: ${brief.slidesCount} ${slideWord}`,
      `- Canvas: ${brief.width}x${brief.height}px`,
      `- Objetivo: ${brief.objectiveLabel}`,
    ].join('\n'),
  );

  sections.push(
    [
      '## Regras do plano (OBRIGATÓRIO)',
      `1. Planeje EXATAMENTE ${brief.slidesCount} ${slideWord} no array "slides".`,
      '2. Antes de decidir, responda internamente: mensagem principal, densidade, papel da imagem, protagonismo da marca, tom visual.',
      '3. Escolha UMA linguagem estética coerente com o briefing — não misture estilos conflitantes.',
      '4. Tipografia: use a fonte da marca. Defina escala headline/corpo. Proibido fonte aleatória por slide.',
      '5. Fundo: prefira solid, editorial_clean ou subtle_texture. useGradient=true SOMENTE se indispensável — inclua gradientRationale.',
      '6. Cores: somente hex da paleta da marca. Contraste texto/fundo explícito.',
      '7. Cada slide precisa: role, headline, compositionLayout, backgroundTreatment, visualElements.',
      '8. guardrails deve incluir: sem gradiente decorativo (salvo exceção justificada), sem fonte genérica, sem fundo aleatório.',
      '9. Em carrossel: slide 1 = capa, meio = desenvolvimento, último = CTA/fechamento.',
      '10. O plano deve parecer trabalho de estúdio profissional — não template genérico de IA.',
    ].join('\n'),
  );

  return sections.join('\n\n');
}

export function buildPlanDesignUserPrompt(userInput: string, brief: PostBrief): string {
  const briefing = userInput.trim() || 'Crie um post alinhado à identidade da marca.';

  return [
    `## Conteúdo do post\n${briefing}`,
    `## Resumo\nRede: ${brief.platformLabel} · ${
      brief.format === 'carousel' ? `Carrossel (${brief.slidesCount} slides)` : 'Imagem única'
    } · Objetivo: ${brief.objectiveLabel}`,
    '## Entrega',
    'Retorne o JSON do plano de design completo. Seja específico em layout, hierarquia, cores e tipografia.',
  ].join('\n\n');
}
