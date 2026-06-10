export interface CopywriterFeedback {
  agentRunId: string;
  companyId: string;
  approved: boolean;
  output: {
    caption: string;
    hashtags: string[];
    tone: string;
  };
  userFeedback?: string;
  editedOutput?: {
    caption?: string;
    hashtags?: string[];
    tone?: string;
  };
}

export function serializeCopywriterLearning(feedback: CopywriterFeedback): string {
  const sections: string[] = [];

  const status = feedback.approved ? 'Aprovado' : 'Rejeitado';
  sections.push(`# Aprendizado do Copywriter\n\nStatus: **${status}**`);

  sections.push(`## Output Original

**Legenda:**
${feedback.output.caption}

**Tom:** ${feedback.output.tone}

**Hashtags:** ${feedback.output.hashtags.join(' ')}`);

  if (feedback.userFeedback) {
    sections.push(`## Feedback do Usuário

${feedback.userFeedback}`);
  }

  if (feedback.editedOutput) {
    sections.push(`## Edições do Usuário`);

    if (
      feedback.editedOutput.caption &&
      feedback.editedOutput.caption !== feedback.output.caption
    ) {
      sections.push(`**Legenda editada:**
${feedback.editedOutput.caption}`);
    }

    if (feedback.editedOutput.hashtags) {
      sections.push(`**Hashtags editadas:** ${feedback.editedOutput.hashtags.join(' ')}`);
    }

    if (feedback.editedOutput.tone && feedback.editedOutput.tone !== feedback.output.tone) {
      sections.push(`**Tom editado:** ${feedback.editedOutput.tone}`);
    }
  }

  sections.push(`## Metadados

- Run ID: ${feedback.agentRunId}
- Company ID: ${feedback.companyId}
- Aprovado: ${feedback.approved}
- Editado: ${!!feedback.editedOutput}`);

  return sections.join('\n\n');
}

export function extractLearningInsights(feedback: CopywriterFeedback): {
  tonePreference?: string;
  hashtagPatterns?: string[];
  captionStyle?: string;
} {
  const insights: ReturnType<typeof extractLearningInsights> = {};

  if (feedback.approved) {
    insights.tonePreference = feedback.editedOutput?.tone ?? feedback.output.tone;

    const finalHashtags = feedback.editedOutput?.hashtags ?? feedback.output.hashtags;
    insights.hashtagPatterns = finalHashtags.filter(
      (tag) => !['#marketing', '#brasil', '#empreendedorismo'].includes(tag.toLowerCase()),
    );

    const finalCaption = feedback.editedOutput?.caption ?? feedback.output.caption;
    if (finalCaption.includes('🎉') || finalCaption.includes('💫')) {
      insights.captionStyle = 'with-emojis';
    } else {
      insights.captionStyle = 'minimal-emojis';
    }
  }

  return insights;
}
