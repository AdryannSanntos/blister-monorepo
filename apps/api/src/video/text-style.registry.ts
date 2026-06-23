import type { TextStyleAnimation } from '@company-os/types';

/**
 * Composition ids registered in the Remotion Root. We keep them equal to the
 * animation slug so a TEXT_STYLE spec maps 1:1 to a composition.
 */
export const COMPOSITION_IDS = [
  'neon-wave',
  'clean-split',
  'kinetic-bold',
  'glass-blur',
  'broadcast',
] as const;

export type CompositionId = (typeof COMPOSITION_IDS)[number];

const FALLBACK_COMPOSITION: CompositionId = 'kinetic-bold';

export function isCompositionId(value: string): value is CompositionId {
  return (COMPOSITION_IDS as readonly string[]).includes(value);
}

/** Map an animation slug to the composition that renders it. */
export function compositionIdForAnimation(
  animation: TextStyleAnimation | string | null | undefined,
): CompositionId {
  return animation && isCompositionId(animation) ? animation : FALLBACK_COMPOSITION;
}
