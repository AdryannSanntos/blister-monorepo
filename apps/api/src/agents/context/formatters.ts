import type { BrandProfile, ContextPack } from '@company-os/agent-sdk';

export function formatBrandContext(profile: BrandProfile | null): string {
  if (!profile) return '';

  const parts: string[] = [];

  if (profile.niche) parts.push(`Nicho: ${profile.niche}`);
  if (profile.description) parts.push(`Descrição: ${profile.description}`);
  if (profile.brandVoice) parts.push(`Tom de voz: ${profile.brandVoice}`);
  if (profile.targetAudience) parts.push(`Público-alvo: ${profile.targetAudience}`);
  if (profile.marketingObjective) parts.push(`Objetivo: ${profile.marketingObjective}`);
  if (profile.mainProducts) parts.push(`Produtos/Serviços: ${profile.mainProducts}`);
  if (profile.differentiators) parts.push(`Diferenciais: ${profile.differentiators}`);
  if (profile.visualStyle) parts.push(`Estilo visual: ${profile.visualStyle}`);

  return parts.join('\n');
}

export function formatContextPackForPrompt(contextPack: ContextPack): string {
  if (contextPack.chunks.length === 0) return '';

  const sections: string[] = [];

  const brandChunks = contextPack.chunks.filter((c) => c.sourceType === 'BRAND_BRAIN');
  const learningChunks = contextPack.chunks.filter((c) => c.sourceType === 'AGENT_LEARNING');
  const campaignChunks = contextPack.chunks.filter((c) =>
    ['CAMPAIGN', 'CAMPAIGN_FILE'].includes(c.sourceType),
  );

  if (brandChunks.length > 0) {
    sections.push('## Contexto da Marca\n' + brandChunks.map((c) => c.content).join('\n\n'));
  }

  if (learningChunks.length > 0) {
    sections.push(
      '## Aprendizados Anteriores\n' + learningChunks.map((c) => c.content).join('\n\n'),
    );
  }

  if (campaignChunks.length > 0) {
    sections.push('## Contexto da Campanha\n' + campaignChunks.map((c) => c.content).join('\n\n'));
  }

  return sections.join('\n\n');
}
