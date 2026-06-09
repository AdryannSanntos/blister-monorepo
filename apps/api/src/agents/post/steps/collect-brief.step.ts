import type { CustomStepExecutor } from '../../runtime/kernel/agent-execution.kernel';
import { buildPostBrief, getNextOnboardingField } from '../onboarding';

/**
 * Onboarding step. Asks one question at a time: while a required field is
 * missing it PAUSES with a single-field form; once the brief is complete it
 * emits the normalized generation parameters and continues.
 */
export const collectBriefStep: CustomStepExecutor = async (context) => {
  const answers = context.inputPayload;
  const field = getNextOnboardingField(answers);

  if (field) {
    return {
      type: 'PAUSED',
      pauseReason: field.label,
      pauseFormSchema: { fields: [field] },
    };
  }

  const brief = buildPostBrief(answers);

  return {
    type: 'CONTINUE',
    output: {
      socialNetwork: brief.socialNetwork,
      platform: brief.platformLabel,
      format: brief.format,
      slidesCount: brief.slidesCount,
      objective: brief.objective,
      width: brief.width,
      height: brief.height,
    },
  };
};
