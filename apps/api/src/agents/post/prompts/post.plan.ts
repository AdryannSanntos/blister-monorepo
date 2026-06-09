import type { BrandProfile, ContextPack } from '../../runtime/kernel/types';
import type { ResolvedAsset } from '../assets';
import type { PostBrief } from '../onboarding';
import { formatPostAgentSkillsForPrompt } from '../skills';
import {
  formatAllowedContextSources,
  formatBrandAssetsForPrompt,
  formatBrandIdentityForPrompt,
  formatBrandPaletteForPrompt,
  formatBrandTypographyForPlanning,
  formatPostBriefForPrompt,
} from './brand-context.format';

/**
 * System prompt for the design planning step. Decisions must follow the
 * company's brand brain, user answers and RAG context — never a generic style.
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
      'Toda decisão estética deve refletir o estilo visual da empresa cadastrado no Cérebro da Marca.',
      'Não escolha estilos genéricos por conveniência — siga a identidade da marca e o briefing.',
    ].join(' '),
  );

  sections.push(formatAllowedContextSources(brandProfile, contextPack));

  const skillsPrompt = formatPostAgentSkillsForPrompt();
  if (skillsPrompt) {
    sections.push(`## Skill de composição (regras técnicas)\n${skillsPrompt}`);
  }

  sections.push(`## Cérebro da Marca\n${formatBrandIdentityForPrompt(brandProfile)}`);
  sections.push(`## Tipografia da marca\n${formatBrandTypographyForPlanning(brandProfile)}`);

  if (brandProfile) {
    sections.push(
      `## Paleta (use somente estas cores)\n${formatBrandPaletteForPrompt(brandProfile.palette)}`,
    );
  }

  sections.push(`## Imagens disponíveis\n${formatBrandAssetsForPrompt(assets)}`);
  sections.push(formatPostBriefForPrompt(brief));

  sections.push(
    [
      '## Regras do plano (OBRIGATÓRIO)',
      `1. Planeje EXATAMENTE ${brief.slidesCount} slide(s) no array "slides".`,
      '2. brandVisualStyle: descreva fielmente o estilo visual da empresa (campo do Cérebro da Marca).',
      '3. aestheticLanguage: rótulo curto coerente com brandVisualStyle — não use estilo genérico conflitante.',
      '4. compositionSystem: descreva o sistema de layout derivado do estilo da marca e do objetivo do post.',
      '5. Tipografia: use a fonte da marca. Defina escala headline/corpo. Proibido fonte aleatória por slide.',
      '6. Fundo: escolha entre solid, subtle_texture, photo_overlay, geometric_pattern conforme estilo da marca e ativos.',
      '7. useGradient=true SOMENTE se indispensável ao estilo da marca — inclua gradientRationale.',
      '8. Cores: somente hex da paleta da marca. Contraste texto/fundo explícito.',
      '9. Cada slide: role, headline, supportingText (se necessário), compositionLayout, backgroundTreatment, visualElements.',
      '10. guardrails: restrições explícitas alinhadas à marca (sem fonte genérica, sem fundo fora da paleta).',
      '11. qualityChecklist: critérios mensuráveis de legibilidade, hierarquia e coerência com a marca.',
      '12. Em carrossel: slide 1 = capa, meio = desenvolvimento, último = CTA/fechamento.',
      '13. O plano deve ser específico o bastante para um designer executar sem improvisar estética.',
    ].join('\n'),
  );

  return sections.join('\n\n');
}

export function buildPlanDesignUserPrompt(userInput: string, brief: PostBrief): string {
  const briefing = userInput.trim() || 'Crie um post alinhado à identidade da marca.';

  return [
    '## Conteúdo do post (pedido do usuário)',
    briefing,
    '',
    formatPostBriefForPrompt(brief),
    '',
    '## Entrega',
    'Retorne o JSON do plano de design completo.',
    'Baseie-se exclusivamente no pedido acima, nas respostas do onboarding, no Cérebro da Marca e no contexto RAG.',
    'Seja específico em layout, hierarquia, cores, tipografia e tratamento de fundo por slide.',
  ].join('\n');
}
