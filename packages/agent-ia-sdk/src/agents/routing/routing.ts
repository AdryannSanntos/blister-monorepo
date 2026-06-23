import type { StepExecutionContext, StepExecutor, StepResult } from '../core/types';
import type { BaseRequestAnalysis, SuggestedPath } from '../schemas/request-analysis';

export type RoutingBranches = Record<string, string[]>;

/**
 * After `after` completes, `decide` picks a branch key; every step listed in a
 * non-selected branch is skipped for the rest of the run. Steps not mentioned
 * in any branch always run.
 */
export interface RoutingRule {
  after: string;
  decide: (context: StepExecutionContext) => string;
  branches: RoutingBranches;
}

/**
 * Given the rules that fire after `afterStepKey`, returns the set of step keys
 * that should be skipped for the remainder of the run.
 */
export const computeRoutingSkips = (
  rules: RoutingRule[],
  afterStepKey: string,
  context: StepExecutionContext,
): Set<string> => {
  const skips = new Set<string>();

  for (const rule of rules) {
    if (rule.after !== afterStepKey) continue;
    const chosen = rule.decide(context);
    for (const [branchKey, steps] of Object.entries(rule.branches)) {
      if (branchKey === chosen) continue;
      for (const stepKey of steps) {
        if (!rule.branches[chosen]?.includes(stepKey)) skips.add(stepKey);
      }
    }
  }

  return skips;
};

/** Wraps an executor so it only runs when `when(context)` is true. */
export const createConditionalStep = (options: {
  when: (context: StepExecutionContext) => boolean;
  run: StepExecutor;
}): StepExecutor => {
  return async (context, deps): Promise<StepResult> => {
    if (!options.when(context)) {
      return { type: 'CONTINUE', output: {} };
    }
    return options.run(context, deps);
  };
};

export interface WorkflowBranchPredicate {
  id: string;
  when: (analysis: BaseRequestAnalysis) => boolean;
}

/** Picks the first matching branch id for a request analysis. */
export const suggestWorkflowPath = (
  analysis: BaseRequestAnalysis,
  options: { branches: WorkflowBranchPredicate[] },
): string | null => {
  for (const branch of options.branches) {
    if (branch.when(analysis)) return branch.id;
  }
  return null;
};

/** Maps the analysis `suggestedPath` enum to a concrete branch id. */
export const mapSuggestedPathToBranch = (
  suggestedPath: SuggestedPath,
  branches: Record<SuggestedPath, string>,
): string => branches[suggestedPath];
