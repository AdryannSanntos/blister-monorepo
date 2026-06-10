"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapSuggestedPathToBranch = exports.suggestWorkflowPath = exports.createConditionalStep = exports.computeRoutingSkips = void 0;
/**
 * Given the rules that fire after `afterStepKey`, returns the set of step keys
 * that should be skipped for the remainder of the run.
 */
const computeRoutingSkips = (rules, afterStepKey, context) => {
    const skips = new Set();
    for (const rule of rules) {
        if (rule.after !== afterStepKey)
            continue;
        const chosen = rule.decide(context);
        for (const [branchKey, steps] of Object.entries(rule.branches)) {
            if (branchKey === chosen)
                continue;
            for (const stepKey of steps) {
                if (!rule.branches[chosen]?.includes(stepKey))
                    skips.add(stepKey);
            }
        }
    }
    return skips;
};
exports.computeRoutingSkips = computeRoutingSkips;
/** Wraps an executor so it only runs when `when(context)` is true. */
const createConditionalStep = (options) => {
    return async (context, deps) => {
        if (!options.when(context)) {
            return { type: 'CONTINUE', output: {} };
        }
        return options.run(context, deps);
    };
};
exports.createConditionalStep = createConditionalStep;
/** Picks the first matching branch id for a request analysis. */
const suggestWorkflowPath = (analysis, options) => {
    for (const branch of options.branches) {
        if (branch.when(analysis))
            return branch.id;
    }
    return null;
};
exports.suggestWorkflowPath = suggestWorkflowPath;
/** Maps the analysis `suggestedPath` enum to a concrete branch id. */
const mapSuggestedPathToBranch = (suggestedPath, branches) => branches[suggestedPath];
exports.mapSuggestedPathToBranch = mapSuggestedPathToBranch;
