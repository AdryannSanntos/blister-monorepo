import {
  AgentBuilder,
  createAdaptiveBriefStep,
  createPauseStep,
  createRetrieveContextStep,
  createValidationStep,
} from '@company-os/agent-sdk';
import { mapToKernelAgentDefinition } from '../adapters/to-kernel-definition';
import { extractLearningInsights, serializePostLearning } from './learning/feedback-handler';
import { buildPostBrief } from './onboarding';
import { POST_CLARIFICATION_FIELDS, POST_ENRICHMENTS } from './clarification';
import { postRequestAnalysisSchema } from './schemas/analysis.schema';
import { postInputZod, postOutputZod, postReviewZod } from './schemas/output.schema';
import { POST_AGENT_SKILL_IDS } from './skills';
import { generatePostStep } from './steps/generate-post.step';
import { planDesignStep } from './steps/plan-design.step';

export const DESIGN_PLAN_APPROVAL_PAUSE_TYPE = 'design_plan_approval';

export const postAgent = AgentBuilder.create({ id: 'post', version: '1.0.0' })
  .label('Criar post')
  .description('Cria posts para redes sociais em HTML+CSS usando a identidade da marca')
  .input(postInputZod)
  .output(postOutputZod)
  .review(postReviewZod)
  .capabilities(['text', 'html', 'structured_output'])
  .withSkills([...POST_AGENT_SKILL_IDS])
  .withContext({
    includeBrandBrain: true,
    includeAgentLearning: true,
    includeCampaignContext: true,
  })
  .withLearning({ serialize: serializePostLearning, extractInsights: extractLearningInsights })
  .addStep('retrieve_context', {
    label: 'Buscar contexto',
    type: 'preparation',
    config: {
      includeBrandBrain: true,
      includeAgentLearning: true,
      includeCampaignContext: true,
    },
    run: createRetrieveContextStep({
      emitSearching: true,
      searchingLabel: 'Consultando o Cérebro da Marca',
    }),
  })
  .addStep('collect_brief', {
    label: 'Entender o pedido',
    type: 'clarification',
    run: createAdaptiveBriefStep({
      analysisSchema: postRequestAnalysisSchema,
      fields: POST_CLARIFICATION_FIELDS,
      enrichments: POST_ENRICHMENTS,
      minConfidenceToSkip: 'high',
      emitThinkingBlock: false,
      buildBrief: (answers) => {
        const slidesCount = answers.slidesCount;
        return {
          socialNetwork: answers.socialNetwork,
          postFormat: answers.postFormat,
          slidesCount: slidesCount === undefined || slidesCount === null ? undefined : String(slidesCount),
          objective: answers.objective,
        };
      },
    }),
  })
  .addStep('plan_design', {
    label: 'Planejar o design',
    type: 'llm_call',
    config: { maxTokens: 4096, temperature: 0.35 },
    run: planDesignStep,
  })
  .addStep('approve_design_plan', {
    label: 'Aprovar plano de design',
    type: 'clarification',
    run: createPauseStep({
      pauseType: DESIGN_PLAN_APPROVAL_PAUSE_TYPE,
      pauseReason: 'Revise e aprove o plano de design para montar o post.',
      until: (context) => context.inputPayload.designPlanApproved === true,
      getFormSchema: () => ({ type: DESIGN_PLAN_APPROVAL_PAUSE_TYPE }),
      onContinue: () => ({ designPlanApproved: true }),
    }),
  })
  .addStep('generate_post', {
    label: 'Montar o post',
    type: 'llm_call',
    config: { maxTokens: 16384, temperature: 0.55 },
    run: generatePostStep,
  })
  .addStep('validate_output', {
    label: 'Validar saída',
    type: 'validation',
    config: { strictValidation: true },
    run: createValidationStep({
      schema: postOutputZod,
      sourceStepKeys: ['generate_post'],
    }),
  })
  .build();

export const postAgentDefinition = mapToKernelAgentDefinition(postAgent.definition);

/** Re-exported so generation can rebuild the typed brief from accumulated answers. */
export { buildPostBrief };
