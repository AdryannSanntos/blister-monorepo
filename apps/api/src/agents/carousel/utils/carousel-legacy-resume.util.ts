/**
 * Legacy carousel runs may have `currentStepKey` pointing at steps that no
 * longer exist in the current `carouselAgent` definition. When such a run is
 * resumed, `resolveStartStepIndex` in `execute-run.ts` can't find the key,
 * falls back to index 0, and the whole pipeline restarts from `generate_ideas`.
 *
 * This map translates a legacy step key into the current step that should run
 * next, so resuming a legacy paused run picks up where it left off.
 *
 * `generate_design_plan` was removed from the pipeline (replaced by a
 * deterministic resolver inside `generate_slides`). Runs that were paused there
 * should jump directly to `generate_slides`.
 *
 * `await_design_approval` was also removed. Runs paused there should resume
 * at `generate_slides`.
 */
const LEGACY_STEP_REMAP: Record<string, string> = {
  generate_design_plan: 'generate_slides',
  await_design_approval: 'generate_slides',
};

export const remapLegacyCarouselStepKey = (currentStepKey: string): string | null =>
  LEGACY_STEP_REMAP[currentStepKey] ?? null;
