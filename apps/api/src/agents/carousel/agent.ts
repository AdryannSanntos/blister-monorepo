import { AgentBuilder, createPauseStep } from '@company-os/agent-ia-sdk/agents';
import {
  carouselInputZod,
  carouselOutputZod,
  carouselIdeaSelectionSchema,
  carouselReviewSchema,
} from './schemas/carousel-schemas';
import { carouselLearningHandler } from './learning/feedback-handler';
import { createGenerateIdeasStep } from './steps/generate-ideas.step';
import { createGenerateContentStep } from './steps/generate-content.step';
import { createGenerateDesignPlanStep } from './steps/generate-design-plan.step';
import { createGenerateSlidesStep } from './steps/generate-slides.step';
import { createRenderSlidesStep } from './steps/render-slides.step';
import { createFinalizeCarouselStep } from './steps/finalize-carousel.step';

const hasIdeaSelection = (payload: Record<string, unknown>) =>
  Boolean(payload.selectedIdeaId || payload.customIdea);

export const carouselAgent = AgentBuilder.create({ id: 'carousel', version: '1.0.0' })
  .label('Carrossel')
  .description('Transforma um tema em slides prontos para o Instagram.')
  .capabilities(['text', 'html'])
  .estimatedCost(0.12)
  .input(carouselInputZod)
  .output(carouselOutputZod)
  // Cosmetic only — surfaces as JSON schema on the built definition, not consumed at runtime.
  // The actual PATCH validation gate is `reviewSchema` on the RegisteredAgent in agent-catalog.ts.
  .review(carouselReviewSchema)
  .addStep('generate_ideas', {
    label: 'Gerando ideias',
    type: 'llm_call',
    run: createGenerateIdeasStep(),
  })
  .addStep('await_idea_selection', {
    label: 'Aguardando seleção',
    type: 'form',
    run: createPauseStep({
      pauseType: 'form',
      until: (ctx) => hasIdeaSelection(ctx.inputPayload as Record<string, unknown>),
      getFormSchema: () => carouselIdeaSelectionSchema,
      pauseReason: 'awaiting_idea_selection',
      onContinue: (ctx) => {
        const payload = ctx.inputPayload as Record<string, unknown>;
        return {
          selectedIdeaId: payload.selectedIdeaId,
          customIdea: payload.customIdea,
          ideas: (ctx.previousStepsOutput.generate_ideas as Record<string, unknown> | undefined)
            ?.ideas,
        };
      },
    }),
  })
  .addStep('generate_content', {
    label: 'Gerando conteúdo',
    type: 'llm_call',
    run: createGenerateContentStep(),
  })
  .addStep('generate_design_plan', {
    label: 'Montando plano de design',
    type: 'llm_call',
    run: createGenerateDesignPlanStep(),
  })
  .addStep('generate_slides', {
    label: 'Gerando slides',
    type: 'llm_call',
    run: createGenerateSlidesStep(),
  })
  .addStep('render_slides', {
    label: 'Renderizando slides',
    type: 'preparation',
    run: createRenderSlidesStep(),
  })
  .addStep('finalize_carousel', {
    label: 'Finalizando',
    type: 'output',
    run: createFinalizeCarouselStep(),
  })
  .withLearning(carouselLearningHandler)
  .build();

export const carouselAgentDefinition = carouselAgent.definition;
