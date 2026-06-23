import type { MediaPlayerInstance } from "@vidstack/react";

export type SeekCutPlayerOptions = {
  /** Time in seconds within a rendered clip (0-based). */
  clipRelativeSec: number;
  /** Absolute source seconds when playing a clipped segment of the source file. */
  sourceAbsoluteSec?: number;
};

/** Seeks the cuts media player using Vidstack remoteControl with a currentTime fallback. */
export const seekCutPlayer = (
  player: MediaPlayerInstance,
  options: SeekCutPlayerOptions,
): void => {
  const seekTime =
    options.sourceAbsoluteSec != null
      ? options.sourceAbsoluteSec
      : options.clipRelativeSec;

  // The player remounts on every cut switch, so a seek triggered mid-transition
  // (keyboard nav, transcript click) can land on a torn-down instance whose
  // reactive state is disposed. Guard the imperative calls so it never throws.
  try {
    player.remoteControl.seek(seekTime);
    void player.play().catch(() => undefined);
  } catch {
    // Player is mid-teardown — ignore.
  }
};
