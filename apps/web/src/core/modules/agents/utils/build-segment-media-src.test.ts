import { describe, expect, it } from "vitest";

import {
  buildSegmentMediaSrc,
  stripMediaFragment,
} from "./build-segment-media-src";

describe("buildSegmentMediaSrc", () => {
  it("appends a media fragment to the base url", () => {
    expect(
      buildSegmentMediaSrc("https://cdn.example.com/video.mp4?sig=1", 45.2, 62.8),
    ).toBe("https://cdn.example.com/video.mp4?sig=1#t=45.2,62.8");
  });

  it("replaces an existing fragment", () => {
    expect(
      buildSegmentMediaSrc(
        "https://cdn.example.com/video.mp4#t=1,2",
        10,
        20,
      ),
    ).toBe("https://cdn.example.com/video.mp4#t=10,20");
  });

  it("enforces a minimum segment length", () => {
    expect(buildSegmentMediaSrc("https://cdn.example.com/v.mp4", 5, 5.1)).toBe(
      "https://cdn.example.com/v.mp4#t=5,5.5",
    );
  });
});

describe("stripMediaFragment", () => {
  it("removes the hash suffix", () => {
    expect(stripMediaFragment("https://cdn.example.com/v.mp4#t=1,2")).toBe(
      "https://cdn.example.com/v.mp4",
    );
  });
});
