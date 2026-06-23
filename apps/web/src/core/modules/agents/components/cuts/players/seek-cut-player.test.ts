import type { MediaPlayerInstance } from "@vidstack/react";
import { describe, expect, it, vi } from "vitest";

import { seekCutPlayer } from "./seek-cut-player";

describe("seekCutPlayer", () => {
  it("seeks rendered clips with clip-relative time via remoteControl", () => {
    const seek = vi.fn();
    const play = vi.fn().mockResolvedValue(undefined);
    const player = {
      remoteControl: { seek },
      currentTime: 0,
      play,
    } as unknown as MediaPlayerInstance;

    seekCutPlayer(player, { clipRelativeSec: 42 });

    expect(seek).toHaveBeenCalledWith(42);
    expect(play).toHaveBeenCalled();
  });

  it("seeks source clips with absolute source seconds", () => {
    const seek = vi.fn();
    const play = vi.fn().mockResolvedValue(undefined);
    const player = {
      remoteControl: { seek },
      currentTime: 0,
      play,
    } as unknown as MediaPlayerInstance;

    seekCutPlayer(player, {
      clipRelativeSec: 0,
      sourceAbsoluteSec: 443,
    });

    expect(seek).toHaveBeenCalledWith(443);
  });
});
