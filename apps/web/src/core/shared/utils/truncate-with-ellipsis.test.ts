import { describe, expect, it } from "vitest";

import {
  DISPLAY_FILENAME_MAX_CHARS,
  truncateWithEllipsis,
} from "./truncate-with-ellipsis";

describe("truncateWithEllipsis", () => {
  it("returns the original string when within the limit", () => {
    expect(truncateWithEllipsis("short.mp4", 20)).toBe("short.mp4");
  });

  it("appends ellipsis when the string exceeds the limit", () => {
    const value =
      "Deus existe Karnal pergunta à Inteligência Artificial. - Prazer, Karnal";

    const truncated = truncateWithEllipsis(value, 40);

    expect(truncated).toBe("Deus existe Karnal pergunta à Intelig...");
    expect(truncated.length).toBe(40);
    expect(truncated.endsWith("...")).toBe(true);
  });

  it("handles very small max lengths", () => {
    expect(truncateWithEllipsis("hello", 2)).toBe("..");
    expect(truncateWithEllipsis("hi", 2)).toBe("hi");
  });

  it("exports a sensible default for display filenames", () => {
    expect(DISPLAY_FILENAME_MAX_CHARS).toBeGreaterThan(ELLIPSIS.length);
  });
});

const ELLIPSIS = "...";
