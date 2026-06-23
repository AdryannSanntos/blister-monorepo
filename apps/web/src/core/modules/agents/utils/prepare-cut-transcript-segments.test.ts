import type {
  CutsTranscriptSegment,
  CutsTranscriptWord,
} from "@company-os/types";
import { describe, expect, it } from "vitest";

import {
  prepareCutTranscriptSegments,
  splitLongTranscriptSegment,
} from "./prepare-cut-transcript-segments";

const segment = (
  overrides: Partial<CutsTranscriptSegment> &
    Pick<CutsTranscriptSegment, "startSec" | "endSec" | "text">,
): CutsTranscriptSegment => ({
  id: overrides.id ?? `seg-${overrides.startSec}`,
  speaker: overrides.speaker,
  ...overrides,
});

/** Builds sequential 1s-per-word timestamps starting at `startSec`. */
const wordsFrom = (text: string, startSec = 0): CutsTranscriptWord[] =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((token, index) => ({
      text: token,
      startSec: startSec + index,
      endSec: startSec + index + 1,
    }));

describe("splitLongTranscriptSegment", () => {
  it("returns a short single-sentence block unchanged", () => {
    const input = segment({
      startSec: 0,
      endSec: 4,
      text: "Short line",
      speaker: "A",
    });

    expect(splitLongTranscriptSegment(input)).toEqual([input]);
  });

  it("splits on sentence boundaries using real word timestamps", () => {
    const text = "Hello world. How are you?";
    const input = segment({
      id: "ts",
      startSec: 0,
      endSec: 5,
      speaker: "A",
      text,
      words: wordsFrom(text),
    });

    const parts = splitLongTranscriptSegment(input);

    expect(parts).toHaveLength(2);
    expect(parts[0]?.text).toBe("Hello world.");
    expect(parts[1]?.text).toBe("How are you?");
    expect(parts[0]?.words).toHaveLength(2);
    expect(parts[1]?.words).toHaveLength(3);
  });

  it("caps long sentences at the 5s display ceiling with word timestamps", () => {
    const text = "a b c d e f g h i j k l";
    const input = segment({
      id: "long",
      startSec: 0,
      endSec: 12,
      text,
      words: wordsFrom(text),
    });

    const parts = splitLongTranscriptSegment(input);

    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((part) => part.endSec - part.startSec <= 5)).toBe(true);
  });

  it("falls back to a proportional 5s split when no word timestamps exist", () => {
    const input = segment({
      id: "fallback",
      startSec: 0,
      endSec: 60,
      speaker: "B",
      text: Array.from({ length: 40 }, (_, index) => `word${index}`).join(" "),
    });

    const parts = splitLongTranscriptSegment(input);

    expect(parts.length).toBeGreaterThan(1);
    expect(parts[0]?.startSec).toBe(0);
    expect(parts.at(-1)?.endSec).toBe(60);
    expect(parts.every((part) => part.speaker === "B")).toBe(true);
    expect(parts.map((part) => part.text).join(" ")).toContain("word39");
  });
});

describe("prepareCutTranscriptSegments", () => {
  it("clips segments to the cut window and splits long lines", () => {
    const segments = [
      segment({
        id: "outside",
        startSec: 0,
        endSec: 10,
        text: "Before cut",
      }),
      segment({
        id: "inside",
        startSec: 30,
        endSec: 90,
        speaker: "A",
        text: Array.from({ length: 36 }, (_, index) => `token${index}`).join(
          " ",
        ),
      }),
    ];

    const prepared = prepareCutTranscriptSegments(segments, 40, 70);

    expect(
      prepared.every((part) => part.startSec >= 40 && part.endSec <= 70),
    ).toBe(true);
    expect(prepared.length).toBeGreaterThan(1);
    expect(prepared[0]?.speaker).toBe("A");
  });

  it("clips word timestamps to the cut window", () => {
    const text = "one two three four five";
    const segments = [
      segment({
        id: "words",
        startSec: 0,
        endSec: 5,
        text,
        words: wordsFrom(text),
      }),
    ];

    const prepared = prepareCutTranscriptSegments(segments, 2, 4);
    const allWords = prepared.flatMap((part) => part.words ?? []);

    expect(allWords.length).toBeGreaterThan(0);
    expect(allWords.every((word) => word.endSec > 2 && word.startSec < 4)).toBe(
      true,
    );
  });
});
