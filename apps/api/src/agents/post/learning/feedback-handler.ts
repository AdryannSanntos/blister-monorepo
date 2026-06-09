export interface PostFeedback {
  agentRunId: string;
  companyId: string;
  approved: boolean;
  output: {
    platform?: string;
    format?: string;
    slidesCount?: number;
    caption: string;
    hashtags: string[];
  };
  userFeedback?: string;
  editedOutput?: {
    caption?: string;
    hashtags?: string[];
  };
}

/**
 * Serializes a post review into a markdown learning note indexed in RAG as
 * AGENT_LEARNING. Future runs retrieve it to repeat what was approved and avoid
 * what was rejected. Slides' HTML is intentionally omitted — it is too large
 * and not useful as retrieval context; the textual signals are what matter.
 */
export function serializePostLearning(feedback: PostFeedback): string {
  const sections: string[] = [];

  const status = feedback.approved ? 'Aprovado' : 'Rejeitado';
  sections.push(`# Aprendizado do Post\n\nStatus: **${status}**`);

  const specParts: string[] = [];
  if (feedback.output.platform) specParts.push(`Rede: ${feedback.output.platform}`);
  if (feedback.output.format) specParts.push(`Formato: ${feedback.output.format}`);
  if (typeof feedback.output.slidesCount === 'number') {
    specParts.push(`Slides: ${feedback.output.slidesCount}`);
  }
  if (specParts.length > 0) {
    sections.push(`## Configuração\n${specParts.join(' · ')}`);
  }

  sections.push(`## Output Original

**Legenda:**
${feedback.output.caption}

**Hashtags:** ${feedback.output.hashtags.join(' ')}`);

  if (feedback.userFeedback) {
    sections.push(`## Feedback do Usuário\n\n${feedback.userFeedback}`);
  }

  if (feedback.editedOutput) {
    const edits: string[] = ['## Edições do Usuário'];
    if (
      feedback.editedOutput.caption &&
      feedback.editedOutput.caption !== feedback.output.caption
    ) {
      edits.push(`**Legenda editada:**\n${feedback.editedOutput.caption}`);
    }
    if (feedback.editedOutput.hashtags) {
      edits.push(`**Hashtags editadas:** ${feedback.editedOutput.hashtags.join(' ')}`);
    }
    if (edits.length > 1) sections.push(edits.join('\n\n'));
  }

  sections.push(`## Metadados

- Run ID: ${feedback.agentRunId}
- Company ID: ${feedback.companyId}
- Aprovado: ${feedback.approved}
- Editado: ${!!feedback.editedOutput}`);

  return sections.join('\n\n');
}

/** Extracts structured signals from a post review for downstream prompting. */
export function extractLearningInsights(feedback: PostFeedback): {
  platformPreference?: string;
  formatPreference?: string;
  hashtagPatterns?: string[];
} {
  const insights: ReturnType<typeof extractLearningInsights> = {};

  if (feedback.approved) {
    insights.platformPreference = feedback.output.platform;
    insights.formatPreference = feedback.output.format;

    const finalHashtags = feedback.editedOutput?.hashtags ?? feedback.output.hashtags;
    insights.hashtagPatterns = finalHashtags.filter(
      (tag) => !['#marketing', '#brasil', '#empreendedorismo'].includes(tag.toLowerCase()),
    );
  }

  return insights;
}
