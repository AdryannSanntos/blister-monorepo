import type { LearningHandler } from '@company-os/agent-ia-sdk/agents';
import type { CarouselOutput } from '@company-os/types';

export type CarouselFeedback = {
  agentRunId: string;
  companyId: string;
  approved: boolean;
  output: CarouselOutput;
  userFeedback?: string;
  templateId?: string;
};

export type CarouselInsights = {
  signalType: string;
  signalValue: string;
  weight: number;
}[];

/**
 * Serializes carousel feedback into a markdown note indexed in RAG as
 * AGENT_LEARNING, so future runs learn preferred templates and slide counts.
 */
export const carouselLearningHandler: LearningHandler<CarouselFeedback, CarouselInsights> = {
  serialize: (feedback) => {
    const lines = [
      '# Carousel Agent Learning',
      `Approved: ${feedback.approved ? 'yes' : 'no'}`,
      `Slides: ${feedback.output.slides.length}`,
      `Template: ${feedback.output.templateId}`,
      `Social network: ${feedback.output.socialNetwork}`,
    ];

    for (const slide of feedback.output.slides) {
      lines.push(`- Slide ${slide.order} (${slide.type}): ${slide.id}`);
    }

    if (feedback.templateId) {
      lines.push(`Requested template: ${feedback.templateId}`);
    }

    if (feedback.userFeedback) {
      lines.push(`User feedback: ${feedback.userFeedback}`);
    }

    return lines.join('\n');
  },

  extractInsights: (feedback) => {
    return [
      {
        signalType: 'preferred_template',
        signalValue: feedback.output.templateId,
        weight: feedback.approved ? 1 : 0.25,
      },
      {
        signalType: 'preferred_slides_count',
        signalValue: String(feedback.output.slides.length),
        weight: feedback.approved ? 0.8 : 0.2,
      },
      {
        signalType: 'preferred_social_network',
        signalValue: feedback.output.socialNetwork,
        weight: feedback.approved ? 0.7 : 0.1,
      },
    ];
  },
};
