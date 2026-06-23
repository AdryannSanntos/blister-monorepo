import { describe, expect, it } from "vitest";

import {
  playerAspectClassName,
  playerFrameClassName,
  resolvePlayerOrientation,
} from "./player-orientation";

describe("resolvePlayerOrientation", () => {
  it("forces vertical regardless of video dimensions", () => {
    expect(resolvePlayerOrientation("vertical", 1920, 1080)).toBe("vertical");
  });

  it("forces horizontal regardless of video dimensions", () => {
    expect(resolvePlayerOrientation("horizontal", 720, 1280)).toBe("horizontal");
  });

  it("detects horizontal from landscape video", () => {
    expect(resolvePlayerOrientation("auto", 1920, 1080)).toBe("horizontal");
  });

  it("detects vertical from portrait video", () => {
    expect(resolvePlayerOrientation("auto", 1080, 1920)).toBe("vertical");
  });

  it("defaults to vertical while dimensions are unknown", () => {
    expect(resolvePlayerOrientation("auto", 0, 0)).toBe("vertical");
  });
});

describe("player layout classes", () => {
  it("maps orientations to aspect classes", () => {
    expect(playerAspectClassName("vertical")).toContain("9/16");
    expect(playerAspectClassName("horizontal")).toContain("aspect-video");
  });

  it("maps orientations to frame classes", () => {
    expect(playerFrameClassName("vertical")).toContain("9/16");
    expect(playerFrameClassName("horizontal")).toContain("aspect-video");
  });
});
