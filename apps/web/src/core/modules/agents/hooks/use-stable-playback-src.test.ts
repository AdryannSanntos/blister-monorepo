import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useStablePlaybackSrc } from "./use-stable-playback-src";

describe("useStablePlaybackSrc", () => {
  it("returns null when no cut is selected", () => {
    const { result } = renderHook(() => useStablePlaybackSrc(null, "https://example.com/a.mp4"));
    expect(result.current).toBeNull();
  });

  it("keeps the last src for the same cut when nextSrc is temporarily null", () => {
    const { result, rerender } = renderHook(
      ({ cutId, src }) => useStablePlaybackSrc(cutId, src),
      {
        initialProps: {
          cutId: "cut-1",
          src: "https://example.com/a.mp4" as string | null,
        },
      },
    );

    expect(result.current).toBe("https://example.com/a.mp4");

    rerender({ cutId: "cut-1", src: null });
    expect(result.current).toBe("https://example.com/a.mp4");
  });

  it("clears playback when the cut changes and no src is ready yet", () => {
    const { result, rerender } = renderHook(
      ({ cutId, src }) => useStablePlaybackSrc(cutId, src),
      {
        initialProps: {
          cutId: "cut-1",
          src: "https://example.com/a.mp4" as string | null,
        },
      },
    );

    rerender({ cutId: "cut-2", src: null });
    expect(result.current).toBeNull();
  });
});
