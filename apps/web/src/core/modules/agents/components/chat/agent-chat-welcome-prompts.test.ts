import { describe, expect, it } from "vitest";
import { splitPromptRows } from "./agent-chat-welcome-prompts";

describe("splitPromptRows", () => {
  it("splits 5 prompts into 3 + 2 rows", () => {
    expect(splitPromptRows(["a", "b", "c", "d", "e"])).toEqual([
      ["a", "b", "c"],
      ["d", "e"],
    ]);
  });

  it("splits 4 prompts into 2 + 2 rows", () => {
    expect(splitPromptRows(["a", "b", "c", "d"])).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("caps at 5 prompts", () => {
    expect(
      splitPromptRows(["a", "b", "c", "d", "e", "f"]).flat().length,
    ).toBe(5);
  });
});
