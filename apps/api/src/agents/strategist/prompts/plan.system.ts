import type { BrandProfile, ContextPack } from '../../runtime/kernel/types';

export function buildStrategistSystemPrompt(
  brandProfile: BrandProfile | null,
  contextPack: ContextPack,
): string {
  const sections: string[] = [];

  sections.push(`# Estrategista de Conteúdo para Redes Sociais

Você é um estrategista de marketing digital especializado em criar planos de conteúdo para pequenos negócios brasileiros.

## Suas responsabilidades

1. **Análise de marca**: Entender profundamente a marca, público e objetivos
2. **Calendário editorial**: Criar um cronograma de postagens realista
3. **Mix de conteúdo**: Balancear tipos de posts (educativo, promocional, engajamento)
4. **Timing**: Sugerir melhores horários baseado no público-alvo
5. **Estratégia**: Recomendar abordagens para maximizar engajamento

## Regras fundamentais

- Planejamentos devem ser práticos e executáveis para pequenos negócios
- Considere a frequência de posts sustentável (não mais que 3/dia)
- Sugira datas realistas (futuras, não passadas)
- Diversifique tipos de conteúdo
- Alinhe com objetivos de marketing da marca`);

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

    if (brandProfile.targetAudience) {
      sections.push(`### Público-Alvo
${brandProfile.targetAudience}`);
    }

    if (brandProfile.marketingObjective) {
      sections.push(`### Objetivo de Marketing
${brandProfile.marketingObjective}`);
    }

    if (brandProfile.mainProducts) {
      sections.push(`### Produtos/Serviços
${brandProfile.mainProducts}`);
    }

    if (brandProfile.socialNetworks && brandProfile.socialNetworks.length > 0) {
      sections.push(`### Redes Sociais Ativas
${brandProfile.socialNetworks.join(', ')}`);
    }
  }

  const learningChunks = contextPack.chunks.filter(
    (c) => c.sourceType === 'AGENT_LEARNING',
  );
  if (learningChunks.length > 0) {
    sections.push(`## Aprendizados de Estratégias Anteriores

${learningChunks.map((c) => c.content).join('\n\n---\n\n')}`);
  }

  sections.push(`## Formato de Resposta

Responda SEMPRE em JSON válido seguindo este schema:

{
  "topics": [
    {
      "title": "Título do post",
      "description": "Descrição do que abordar",
      "suggestedDate": "YYYY-MM-DD",
      "platform": "instagram",
      "priority": "high"
    }
  ],
  "calendar": {
    "weeklyPosts": 3,
    "bestTimes": ["09:00", "12:00", "18:00"],
    "platforms": ["instagram"]
  },
  "recommendations": "Recomendações estratégicas detalhadas"
}

Regras:
- Mínimo 3, máximo 14 tópicos
- Datas futuras apenas
- Horários no formato HH:MM
- Recomendações detalhadas e acionáveis`);

  return sections.join('\n\n');
}

export function buildStrategistUserPrompt(userInput: string): string {
  return `Crie um plano de conteúdo estratégico baseado no seguinte briefing:

${userInput}

Considere o perfil da marca, público-alvo e objetivos de marketing ao criar o plano.`;
}
