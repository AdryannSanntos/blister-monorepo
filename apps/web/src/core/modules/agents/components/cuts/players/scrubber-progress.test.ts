import { describe, expect, it, vi } from "vitest";

import {
  scrubberProgressPercent,
  scrubberSeekTime,
} from "./scrubber-progress";

describe("scrubberProgressPercent", () => {
  it("returns 0 when duration is invalid", () => {
    expect(scrubberProgressPercent(10, 0)).toBe(0);
    expect(scrubberProgressPercent(10, Number.NaN)).toBe(0);
  });

  it("returns clamped percentage for valid inputs", () => {
    expect(scrubberProgressPercent(30, 60)).toBe(50);
    expect(scrubberProgressPercent(90, 60)).toBe(100);
  });
});

describe("scrubberSeekTime", () => {
  it("maps pointer position to seek time", () => {
    const rect = { left: 100, width: 200 };
    expect(scrubberSeekTime(150, rect, 60)).toBe(15);
    expect(scrubberSeekTime(300, rect, 60)).toBe(60);
    expect(scrubberSeekTime(50, rect, 60)).toBe(0);
  });
});
