import type { CustomStepExecutor } from '../../runtime/kernel/agent-execution.kernel';
import { postDesignPlanZod } from '../schemas/design-plan.schema';

export const DESIGN_PLAN_APPROVAL_PAUSE_TYPE = 'design_plan_approval';

/**
 * Human-in-the-loop gate between planning and HTML generation. The run pauses
 * until the user approves the design plan emitted by plan_design.
 */
export const approveDesignPlanStep: CustomStepExecutor = async (context) => {
  const planRaw = context.previousStepsOutput.plan_design?.designPlan;
  const parsedPlan = postDesignPlanZod.safeParse(planRaw);

  if (!parsedPlan.success) {
    return {
      type: 'FAILED',
      error: 'O plano de design não está disponível. Reinicie a geração.',
    };
  }

  if (context.inputPayload.designPlanApproved === true) {
    return {
      type: 'CONTINUE',
      output: { designPlanApproved: true },
    };
  }

  return {
    type: 'PAUSED',
    pauseReason: 'Revise e aprove o plano de design para montar o post.',
    pauseFormSchema: { type: DESIGN_PLAN_APPROVAL_PAUSE_TYPE },
    output: { awaitingDesignPlanApproval: true },
  };
};
