import { describe, expect, it } from "vitest";

import { viralScoreBadgeVariant } from "./viral-score";

describe("viralScoreBadgeVariant", () => {
  it("highlights high-potential cuts with the brand accent", () => {
    expect(viralScoreBadgeVariant(80)).toBe("accent");
    expect(viralScoreBadgeVariant(92)).toBe("accent");
    expect(viralScoreBadgeVariant(100)).toBe("accent");
  });

  it("uses a neutral tone for mid-range cuts", () => {
    expect(viralScoreBadgeVariant(50)).toBe("secondary");
    expect(viralScoreBadgeVariant(79)).toBe("secondary");
  });

  it("uses a quiet outline for low-potential cuts", () => {
    expect(viralScoreBadgeVariant(0)).toBe("outline");
    expect(viralScoreBadgeVariant(49)).toBe("outline");
  });
});
