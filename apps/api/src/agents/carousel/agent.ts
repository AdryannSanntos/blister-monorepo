import { AgentBuilder, createPauseStep } from '@company-os/agent-ia-sdk/agents';
import {
  carouselInputZod,
  carouselOutputZod,
  carouselIdeaSelectionSchema,
  carouselContentApprovalSchema,
  carouselDesignApprovalSchema,
} from './schemas/carousel-schemas';
import { carouselLearningHandler } from './learning/feedback-handler';
import { createGenerateIdeasStep } from './steps/generate-ideas.step';
import { createGenerateContentStep } from './steps/generate-content.step';
import { createGenerateDesignPlanStep } from './steps/generate-design-plan.step';
import { createGenerateSlidesStep } from './steps/generate-slides.step';
import { createRenderSlidesStep } from './steps/render-slides.step';
import { createFinalizeCarouselStep } from './steps/finalize-carousel.step';

export const carouselAgent = AgentBuilder.create({ id: 'carousel', version: '1.0.0' })
  .label('Carrossel')
  .description('Transforma um tema em slides prontos para o Instagram.')
  .capabilities(['text', 'html'])
  .estimatedCost(0.12)
  .input(carouselInputZod)
  .output(carouselOutputZod)
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
      until: (ctx) => Boolean((ctx.inputPayload as Record<string, unknown>).selectedIdeaId),
      getFormSchema: () => carouselIdeaSelectionSchema,
      pauseReason: 'awaiting_idea_selection',
      onContinue: (ctx) => ({
        selectedIdeaId: (ctx.inputPayload as Record<string, unknown>).selectedIdeaId,
        ideas: (ctx.previousStepsOutput.generate_ideas as Record<string, unknown> | undefined)
          ?.ideas,
      }),
    }),
  })
  .addStep('generate_content', {
    label: 'Gerando conteúdo',
    type: 'llm_call',
    run: createGenerateContentStep(),
  })
  .addStep('await_content_approval', {
    label: 'Aguardando aprovação',
    type: 'form',
    run: createPauseStep({
      pauseType: 'form',
      until: (ctx) => {
        const payload = ctx.inputPayload as Record<string, unknown>;
        return payload.contentApproved === true || payload.contentApproved === false;
      },
      getFormSchema: () => carouselContentApprovalSchema,
      pauseReason: 'awaiting_content_approval',
      onContinue: (ctx) => {
        const payload = ctx.inputPayload as Record<string, unknown>;
        const contentOutput = ctx.previousStepsOutput.generate_content as
          | Record<string, unknown>
          | undefined;
        return {
          contentApproved: payload.contentApproved,
          slides: payload.slides ?? contentOutput?.slides,
        };
      },
    }),
  })
  .addStep('generate_design_plan', {
    label: 'Montando plano de design',
    type: 'llm_call',
    run: createGenerateDesignPlanStep(),
  })
  .addStep('await_design_approval', {
    label: 'Aguardando aprovação do design',
    type: 'form',
    run: createPauseStep({
      pauseType: 'form',
      until: (ctx) => {
        const payload = ctx.inputPayload as Record<string, unknown>;
        return payload.designApproved === true || payload.designApproved === false;
      },
      getFormSchema: () => carouselDesignApprovalSchema,
      pauseReason: 'awaiting_design_approval',
      onContinue: (ctx) => {
        const payload = ctx.inputPayload as Record<string, unknown>;
        const designOutput = ctx.previousStepsOutput.generate_design_plan as
          | Record<string, unknown>
          | undefined;
        return {
          designApproved: payload.designApproved,
          plan: payload.plan ?? designOutput?.plan,
          imageUploads: (payload.imageUploads as Record<string, string> | undefined) ?? {},
        };
      },
    }),
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
  .addRouting({
    after: 'await_content_approval',
    decide: (ctx) => {
      const approved = (ctx.inputPayload as { contentApproved?: boolean }).contentApproved;
      return approved === false ? 'reject' : 'approve';
    },
    branches: {
      approve: [
        'generate_design_plan',
        'await_design_approval',
        'generate_slides',
        'render_slides',
        'finalize_carousel',
      ],
      reject: ['generate_content'],
    },
  })
  .addRouting({
    after: 'await_design_approval',
    decide: (ctx) => {
      const approved = (ctx.inputPayload as { designApproved?: boolean }).designApproved;
      return approved === false ? 'reject' : 'approve';
    },
    branches: {
      approve: ['generate_slides', 'render_slides', 'finalize_carousel'],
      reject: ['generate_design_plan'],
    },
  })
  .withLearning(carouselLearningHandler)
  .build();

export const carouselAgentDefinition = carouselAgent.definition;
