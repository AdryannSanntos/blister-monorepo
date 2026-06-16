import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useStableMediaUrl } from "./use-stable-media-url";

describe("useStableMediaUrl", () => {
  it("keeps the first url for the same resource key", () => {
    const { result, rerender } = renderHook(
      ({ key, url }) => useStableMediaUrl(key, url),
      {
        initialProps: {
          key: "file-1",
          url: "https://cdn.example.com/a?sig=1",
        },
      },
    );

    expect(result.current).toBe("https://cdn.example.com/a?sig=1");

    rerender({
      key: "file-1",
      url: "https://cdn.example.com/a?sig=2",
    });

    expect(result.current).toBe("https://cdn.example.com/a?sig=1");
  });

  it("resets when the resource key changes", () => {
    const { result, rerender } = renderHook(
      ({ key, url }) => useStableMediaUrl(key, url),
      {
        initialProps: {
          key: "file-1",
          url: "https://cdn.example.com/a",
        },
      },
    );

    rerender({
      key: "file-2",
      url: "https://cdn.example.com/b",
    });

    expect(result.current).toBe("https://cdn.example.com/b");
  });
});
