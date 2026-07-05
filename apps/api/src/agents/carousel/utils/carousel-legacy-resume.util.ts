/**
 * Legacy carousel runs may have `currentStepKey` pointing at pause steps that
 * no longer exist in the current `carouselAgent` step list (`await_content_approval`,
 * `await_design_approval` were removed). When such a run is resumed,
 * `resolveStartStepIndex` in `execute-run.ts` can't find the key, falls back to
 * index 0, and the whole pipeline restarts from `generate_ideas` — discarding
 * already-approved idea/content/design output.
 *
 * This map translates a legacy step key into the current step that should run
 * next, so resuming a legacy paused run picks up where it left off instead of
 * regenerating everything.
 */
const LEGACY_STEP_REMAP: Record<string, string> = {
  await_content_approval: 'generate_design_plan',
  await_design_approval: 'generate_slides',
};

export const remapLegacyCarouselStepKey = (currentStepKey: string): string | null =>
  LEGACY_STEP_REMAP[currentStepKey] ?? null;
