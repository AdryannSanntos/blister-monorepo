import type { BrandProfile, ContextPack } from '@company-os/agent-sdk';

export function buildCopywriterSystemPrompt(
  brandProfile: BrandProfile | null,
  contextPack: ContextPack,
): string {
  const sections: string[] = [];

  sections.push(`# Copywriter de Marketing para Redes Sociais

Você é um copywriter especializado em criar legendas e textos de marketing para pequenos negócios brasileiros.

## Regras fundamentais

1. **Tom de voz**: Respeite SEMPRE o tom de voz da marca definido no perfil
2. **Público-alvo**: Adapte a linguagem para o público específico da marca
3. **Concisão**: Legendas devem ser diretas e impactantes
4. **CTAs**: Inclua chamadas para ação quando apropriado
5. **Emojis**: Use com moderação, respeitando o estilo da marca
6. **Hashtags**: Gere hashtags relevantes, misturando populares e de nicho`);

  if (brandProfile) {
    sections.push(`## Perfil da Marca`);

    if (brandProfile.brandVoice) {
      sections.push(`### Tom de Voz
${brandProfile.brandVoice}`);
    }

    if (brandProfile.niche) {
      sections.push(`### Nicho
${brandProfile.niche}`);
    }

    if (brandProfile.description) {
      sections.push(`### Descrição
${brandProfile.description}`);
    }

    if (brandProfile.targetAudience) {
      sections.push(`### Público-Alvo
${brandProfile.targetAudience}`);
    }

    if (brandProfile.mainProducts) {
      sections.push(`### Produtos/Serviços
${brandProfile.mainProducts}`);
    }

    if (brandProfile.differentiators) {
      sections.push(`### Diferenciais
${brandProfile.differentiators}`);
    }

    if (brandProfile.marketingObjective) {
      sections.push(`### Objetivo de Marketing
${brandProfile.marketingObjective}`);
    }
  }

  const learningChunks = contextPack.chunks.filter((c) => c.sourceType === 'AGENT_LEARNING');
  if (learningChunks.length > 0) {
    sections.push(`## Aprendizados de Posts Anteriores

Analise os exemplos abaixo de posts que foram aprovados ou rejeitados para entender melhor o que funciona para esta marca:

${learningChunks.map((c) => c.content).join('\n\n---\n\n')}`);
  }

  const campaignChunks = contextPack.chunks.filter((c) =>
    ['CAMPAIGN', 'CAMPAIGN_FILE'].includes(c.sourceType),
  );
  if (campaignChunks.length > 0) {
    sections.push(`## Contexto da Campanha

${campaignChunks.map((c) => c.content).join('\n\n')}`);
  }

  sections.push(`## Formato de Resposta

Responda SEMPRE em JSON válido seguindo este schema:

{
  "caption": "A legenda completa para o post",
  "hashtags": ["#hashtag1", "#hashtag2", ...],
  "tone": "professional | casual | enthusiastic | informative | friendly"
}

Regras para hashtags:
- Mínimo 3, máximo 30 hashtags
- Inclua hashtags do nicho da marca
- Inclua hashtags populares relacionadas
- Todas devem começar com #`);

  return sections.join('\n\n');
}

export function buildCopywriterUserPrompt(userInput: string): string {
  return `Crie uma legenda de marketing para redes sociais com o seguinte briefing:

${userInput}

Lembre-se de respeitar o tom de voz da marca e gerar hashtags relevantes.`;
}
