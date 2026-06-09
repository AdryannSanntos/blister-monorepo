import type { CustomStepExecutor } from '../runtime/kernel/agent-execution.kernel';
import { approveDesignPlanStep } from './steps/approve-design-plan.step';
import { collectBriefStep } from './steps/collect-brief.step';
import { generatePostStep } from './steps/generate-post.step';
import { planDesignStep } from './steps/plan-design.step';
import { retrieveContextStep } from './steps/retrieve-context.step';
import { validateOutputStep } from './steps/validate-output.step';

export { postAgentDefinition } from './agent.definition';
export {
  postOutputSchema,
  postOutputZod,
  postLlmOutputSchema,
  postLlmOutputZod,
  postReviewZod,
  validatePostOutput,
} from './schemas/output.schema';
export type { PostOutput, PostSlide, PostLlmOutput } from './schemas/output.schema';
export { buildPostSystemPrompt, buildPostUserPrompt } from './prompts/post.system';
export { approveDesignPlanStep, DESIGN_PLAN_APPROVAL_PAUSE_TYPE } from './steps/approve-design-plan.step';
export { collectBriefStep } from './steps/collect-brief.step';
export { planDesignStep } from './steps/plan-design.step';
export { generatePostStep } from './steps/generate-post.step';
export { serializePostLearning, extractLearningInsights } from './learning/feedback-handler';
export type { PostFeedback } from './learning/feedback-handler';
export {
  getNextOnboardingField,
  buildPostBrief,
} from './onboarding';
export type {
  ClarificationField,
  PostBrief,
  SocialNetwork,
  PostFormat,
  PostObjective,
} from './onboarding';
export { resolveBrandAssets } from './assets';
export type { ResolvedAsset } from './assets';
export {
  POST_AGENT_SKILL_IDS,
  getPostAgentSkills,
  formatPostAgentSkillsForPrompt,
} from './skills';
export type { PostAgentSkillId } from './skills';

/**
 * Custom step executors contributed by the post agent, keyed by
 * `"<agentId>:<stepKey>"`. Consumed by the kernel's custom-steps registry.
 */
export const postStepExecutors: Record<string, CustomStepExecutor> = {
  'post:retrieve_context': retrieveContextStep,
  'post:collect_brief': collectBriefStep,
  'post:plan_design': planDesignStep,
  'post:approve_design_plan': approveDesignPlanStep,
  'post:generate_post': generatePostStep,
  'post:validate_output': validateOutputStep,
};
