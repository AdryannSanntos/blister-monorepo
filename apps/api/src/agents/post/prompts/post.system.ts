import { normalizeBrandPalette } from '@company-os/types';

import { formatContextPackForPrompt } from '../../runtime/kernel/step-context.builder';
import type { BrandProfile, ContextPack } from '../../runtime/kernel/types';
import type { ResolvedAsset } from '../assets';
import type { PostBrief } from '../onboarding';
import type { PostDesignPlan } from '../schemas/design-plan.schema';
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
    return 'Nenhum perfil de marca disponível. Execute o plano com visual neutro e profissional.';
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

function formatBrandTypography(profile: BrandProfile | null, designPlan: PostDesignPlan): string {
  const brandFont = profile?.typography?.trim();
  const plannedFont = designPlan.typography.primaryFont;

  const lines = [
    `Fonte principal (plano aprovado): ${plannedFont}`,
    designPlan.typography.secondaryFont
      ? `Fonte secundária: ${designPlan.typography.secondaryFont}`
      : null,
    `Escala headline: ${designPlan.typography.headlineScale}`,
    `Escala corpo: ${designPlan.typography.bodyScale}`,
    `Regras: ${designPlan.typography.rules}`,
    brandFont ? `Fonte cadastrada na marca: ${brandFont}` : null,
    'PROIBIDO trocar ou inventar outra font-family em qualquer slide.',
  ].filter(Boolean);

  return lines.join('\n');
}

function formatTechnicalStackRules(): string {
  return [
    '## Stack técnico obrigatório (cada slide)',
    '- HTML completo com <style> inline. Sem arquivos CSS externos. Sem JavaScript.',
    '- Ícones **Lucide** somente como <svg> inline (viewBox="0 0 24 24", stroke="currentColor", fill="none", stroke-width="2").',
    '- Proibido: Font Awesome, Material Icons, emoji como ícone, <script>, React, Vue.',
    '- Carregue a fonte via Google Fonts <link> no <head> usando EXATAMENTE a família do plano.',
  ].join('\n');
}

function formatAssets(assets: ResolvedAsset[]): string {
  if (assets.length === 0) {
    return [
      'Nenhuma imagem da marca disponível.',
      'Siga o backgroundTreatment de cada slide do plano com cor sólida ou composição tipográfica.',
      'NÃO use imagens externas, fotos de banco ou placeholders.',
    ].join(' ');
  }

  const list = assets.map((asset) => `- ${asset.label}: ${asset.url}`).join('\n');

  return [
    'Use SOMENTE as imagens abaixo via <img src="URL_EXATA"> quando o plano prever imagem.',
    '',
    list,
  ].join('\n');
}

function formatDesignPlanForExecution(plan: PostDesignPlan): string {
  const slidePlans = plan.slides
    .map((slide) => {
      const lines = [
        `### Slide ${slide.index} (${slide.role})`,
        `- Headline: ${slide.headline}`,
        slide.supportingText ? `- Apoio: ${slide.supportingText}` : null,
        `- Layout: ${slide.compositionLayout}`,
        `- Fundo: ${slide.backgroundTreatment}`,
        slide.cta ? `- CTA: ${slide.cta}` : null,
        `- Elementos visuais: ${slide.visualElements.join(', ')}`,
        slide.safeAreaNotes ? `- Área segura: ${slide.safeAreaNotes}` : null,
      ].filter(Boolean);
      return lines.join('\n');
    })
    .join('\n\n');

  const gradientRule = plan.colorStrategy.useGradient
    ? `Gradiente permitido APENAS conforme plano: ${plan.colorStrategy.gradientRationale ?? 'justificado no plano'}`
    : 'PROIBIDO usar gradientes decorativos — fundo conforme backgroundType do plano.';

  return [
    '## Plano de design aprovado (SIGA À RISCA)',
    `Direção criativa: ${plan.creativeDirection}`,
    `Estilo visual da empresa: ${plan.brandVisualStyle}`,
    `Linguagem estética: ${plan.aestheticLanguage}`,
    `Sistema de composição: ${plan.compositionSystem}`,
    `Presença da marca: ${plan.brandPresence}`,
    '',
    '### Tipografia',
    `- Principal: ${plan.typography.primaryFont}`,
    plan.typography.secondaryFont ? `- Secundária: ${plan.typography.secondaryFont}` : null,
    `- Regras: ${plan.typography.rules}`,
    '',
    '### Cores',
    `- Tipo de fundo: ${plan.colorStrategy.backgroundType}`,
    `- Fundo principal: ${plan.colorStrategy.primaryBackground}`,
    `- Texto: ${plan.colorStrategy.textColor}`,
    plan.colorStrategy.accentColor ? `- Destaque: ${plan.colorStrategy.accentColor}` : null,
    `- ${gradientRule}`,
    '',
    '### Slides',
    slidePlans,
    '',
    '### Guardrails',
    ...plan.guardrails.map((item) => `- ${item}`),
    '',
    '### Checklist de qualidade',
    ...plan.qualityChecklist.map((item) => `- ${item}`),
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * System prompt for HTML/CSS generation. Execution must follow the pre-approved
 * design plan — no improvising fonts, backgrounds or gradients.
 */
export function buildPostSystemPrompt(
  brandProfile: BrandProfile | null,
  contextPack: ContextPack,
  brief: PostBrief,
  assets: ResolvedAsset[],
  designPlan: PostDesignPlan,
): string {
  const sections: string[] = [];

  sections.push(
    [
      'Você é um designer front-end sênior que implementa posts sociais em HTML + CSS.',
      'O plano de design já foi aprovado — sua função é EXECUTAR o plano com precisão profissional.',
      'Não improvise estética, fontes ou fundos fora do que está no plano.',
    ].join(' '),
  );

  sections.push(formatDesignPlanForExecution(designPlan));

  sections.push(`## Identidade da marca\n${formatBrandIdentity(brandProfile)}`);
  sections.push(
    `## Tipografia (execução)\n${formatBrandTypography(brandProfile, designPlan)}`,
  );

  if (brandProfile) {
    sections.push(
      `## Paleta de cores (use apenas estas cores)\n${formatPalette(brandProfile.palette)}`,
    );
  }

  const skillsPrompt = formatPostAgentSkillsForPrompt();
  if (skillsPrompt) {
    sections.push(`## Referência da skill\n${skillsPrompt}`);
  }

  sections.push(formatTechnicalStackRules());
  sections.push(`## Imagens disponíveis\n${formatAssets(assets)}`);

  const brandContext = formatContextPackForPrompt(contextPack);
  if (brandContext) {
    sections.push(brandContext);
  }

  const slideWord = brief.slidesCount === 1 ? 'slide' : 'slides';
  sections.push(
    [
      '## Especificações do post',
      `- Rede social: ${brief.platformLabel}`,
      `- Formato: ${brief.format === 'carousel' ? 'Carrossel' : 'Imagem única'}`,
      `- Quantidade: ${brief.slidesCount} ${slideWord}`,
      `- Dimensões: ${brief.width}x${brief.height}px`,
      `- Objetivo: ${brief.objectiveLabel}`,
    ].join('\n'),
  );

  sections.push(
    [
      '## Regras de execução (OBRIGATÓRIO)',
      `1. Gere EXATAMENTE ${brief.slidesCount} ${slideWord} — um HTML por slide, seguindo o plano slide a slide.`,
      '2. Cada slide: <head> com Google Fonts da fonte do plano + <body> + <style> inline.',
      `3. Canvas raiz: width ${brief.width}px, height ${brief.height}px, box-sizing border-box, overflow hidden.`,
      '4. Implemente headline, layout, fundo e elementos visuais EXATAMENTE como descrito no plano.',
      '5. Sem gradiente decorativo se useGradient=false no plano.',
      '6. Sem font-family diferente da definida no plano.',
      '7. Sem fundo aleatório — use primaryBackground e backgroundTreatment do plano.',
      '8. Qualidade profissional: alinhamento intencional, respiro, contraste, área segura.',
      '9. Legenda ("caption") no tom da marca + hashtags (sem #).',
    ].join('\n'),
  );

  return sections.join('\n\n');
}

/** User prompt for the execution step. */
export function buildPostUserPrompt(
  userInput: string,
  brief: PostBrief,
  designPlan: PostDesignPlan,
): string {
  const briefing = userInput.trim() || 'Execute o plano de design aprovado.';

  return [
    `## Conteúdo do post\n${briefing}`,
    `## Resumo\nRede: ${brief.platformLabel} · ${
      brief.format === 'carousel' ? `Carrossel (${brief.slidesCount} slides)` : 'Imagem única'
    } · Objetivo: ${brief.objectiveLabel}`,
    `## Direção\n${designPlan.creativeDirection}`,
    'Implemente o plano nos slides HTML. Não desvie da tipografia, cores e composição definidas.',
  ].join('\n\n');
}
