import { shouldShowCutThumbnail, withStableCutIds } from "./cuts-display";
import type { CutOutput } from "@company-os/types";

describe("withStableCutIds", () => {
  const baseCut = (id: string, index = 0): CutOutput => ({
    id,
    title: `Cut ${index}`,
    description: "",
    startSec: index * 10,
    endSec: index * 10 + 30,
    durationSec: 30,
    viralScore: 80,
    reviewStatus: "pending",
  });

  it("replaces duplicate ids with index-based ids", () => {
    const duplicateId = "cmqcrntgj0001rqpqbd8f7i8g";
    const result = withStableCutIds([
      baseCut(duplicateId, 0),
      baseCut(duplicateId, 1),
      baseCut(duplicateId, 2),
    ]);

    expect(result.map((cut) => cut.id)).toEqual(["cut-1", "cut-2", "cut-3"]);
  });

  it("normalizes legacy ids to index-based ids", () => {
    const result = withStableCutIds([baseCut("legacy-a", 0), baseCut("legacy-b", 1)]);
    expect(result.map((cut) => cut.id)).toEqual(["cut-1", "cut-2"]);
  });
});

describe("shouldShowCutThumbnail", () => {
  it("shows a thumbnail for every rendered clip, even when not selected", () => {
    expect(
      shouldShowCutThumbnail({
        hasVideoSrc: true,
        usesRenderedClip: true,
        selected: false,
      }),
    ).toBe(true);
  });

  it("shows the shared source preview only for the selected non-rendered cut", () => {
    expect(
      shouldShowCutThumbnail({
        hasVideoSrc: true,
        usesRenderedClip: false,
        selected: true,
      }),
    ).toBe(true);
    expect(
      shouldShowCutThumbnail({
        hasVideoSrc: true,
        usesRenderedClip: false,
        selected: false,
      }),
    ).toBe(false);
  });

  it("never shows a thumbnail without a resolved video source", () => {
    expect(
      shouldShowCutThumbnail({
        hasVideoSrc: false,
        usesRenderedClip: true,
        selected: true,
      }),
    ).toBe(false);
  });
});
