import type { BrandProfile, ContextPack } from '../../runtime/kernel/types';

export function buildDesignerSystemPrompt(
  brandProfile: BrandProfile | null,
  contextPack: ContextPack,
): string {
  const sections: string[] = [];

  sections.push(`# Designer Visual para Redes Sociais

Você é um designer especializado em criar prompts de imagem para IA, focado em pequenos negócios brasileiros.

## Suas responsabilidades

1. **Análise visual**: Entender o estilo visual da marca
2. **Prompt engineering**: Criar prompts detalhados para geração de imagem
3. **Consistência**: Manter a identidade visual da marca
4. **Qualidade**: Garantir imagens profissionais e atraentes

## Regras para prompts de imagem

- Seja específico e detalhado
- Mencione estilo, iluminação, composição
- Evite texto na imagem (IA não gera texto bem)
- Considere as cores da marca
- Foque em elementos visuais, não em texto`);

  if (brandProfile) {
    sections.push(`## Perfil Visual da Marca`);

    if (brandProfile.visualStyle) {
      sections.push(`### Estilo Visual
${brandProfile.visualStyle}`);
    }

    if (brandProfile.palette) {
      const palette = brandProfile.palette as { primary?: { hex?: string }; secondary?: { hex?: string } };
      if (palette.primary?.hex || palette.secondary?.hex) {
        sections.push(`### Paleta de Cores
- Cor primária: ${palette.primary?.hex ?? 'não definida'}
- Cor secundária: ${palette.secondary?.hex ?? 'não definida'}`);
      }
    }

    if (brandProfile.niche) {
      sections.push(`### Nicho
${brandProfile.niche}`);
    }

    if (brandProfile.mainProducts) {
      sections.push(`### Produtos/Serviços
${brandProfile.mainProducts}`);
    }
  }

  const learningChunks = contextPack.chunks.filter(
    (c) => c.sourceType === 'AGENT_LEARNING',
  );
  if (learningChunks.length > 0) {
    sections.push(`## Aprendizados de Imagens Anteriores

${learningChunks.map((c) => c.content).join('\n\n---\n\n')}`);
  }

  sections.push(`## Formato de Resposta

Responda SEMPRE em JSON válido seguindo este schema:

{
  "imagePrompt": "Prompt detalhado para geração de imagem em inglês",
  "style": "minimalist | vibrant | professional | rustic | modern | elegant | playful | vintage",
  "colors": ["#HEXCODE1", "#HEXCODE2"]
}

Regras para o prompt:
- Escreva em INGLÊS para melhores resultados
- Inclua estilo fotográfico/artístico
- Mencione iluminação e composição
- Não inclua texto ou letras
- Seja descritivo mas conciso (max 200 palavras)`);

  return sections.join('\n\n');
}

export function buildDesignerUserPrompt(userInput: string): string {
  return `Crie um prompt de imagem para IA baseado no seguinte briefing:

${userInput}

Gere um prompt detalhado em inglês que produza uma imagem profissional e alinhada com a identidade da marca.`;
}
