import type { CutsTranscriptSegment } from "@company-os/types";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CutTranscriptPanel } from "./cut-transcript-panel";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    if (key === "speakerLabel" && params?.label) {
      return `Speaker ${params.label}`;
    }
    return key;
  },
}));

const segment = (
  overrides: Partial<CutsTranscriptSegment> &
    Pick<CutsTranscriptSegment, "startSec" | "endSec" | "text">,
): CutsTranscriptSegment => ({
  id: overrides.id ?? `seg-${overrides.startSec}`,
  speaker: overrides.speaker,
  ...overrides,
});

describe("CutTranscriptPanel", () => {
  it("marks the active line while playback is in range", () => {
    render(
      <CutTranscriptPanel
        segments={[
          segment({ id: "a", startSec: 10, endSec: 15, text: "First line" }),
          segment({ id: "b", startSec: 15, endSec: 20, text: "Second line" }),
        ]}
        currentSourceSec={16}
        onSeek={() => undefined}
      />,
    );

    const activeLine = screen.getByText("Second line").closest("li");
    expect(activeLine).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("First line").closest("li")).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("renders the speaker label for each line", () => {
    render(
      <CutTranscriptPanel
        segments={[
          segment({
            id: "a",
            startSec: 0,
            endSec: 5,
            text: "Speaker A line",
            speaker: "A",
          }),
          segment({
            id: "b",
            startSec: 5,
            endSec: 10,
            text: "Speaker B line",
            speaker: "B",
          }),
        ]}
        currentSourceSec={0}
        onSeek={() => undefined}
      />,
    );

    expect(screen.getByText("Speaker A")).toBeInTheDocument();
    expect(screen.getByText("Speaker B")).toBeInTheDocument();
  });

  it("calls onSeek with the line start when a line is clicked", () => {
    const onSeek = vi.fn();

    render(
      <CutTranscriptPanel
        segments={[segment({ startSec: 42, endSec: 48, text: "Jump here" })]}
        currentSourceSec={0}
        onSeek={onSeek}
      />,
    );

    fireEvent.click(screen.getByText("Jump here"));
    expect(onSeek).toHaveBeenCalledWith(42);
  });

  it("calls onSeek with the exact word start when a word is clicked", () => {
    const onSeek = vi.fn();

    render(
      <CutTranscriptPanel
        segments={[
          segment({
            startSec: 10,
            endSec: 14,
            text: "jump precisely",
            words: [
              { text: "jump", startSec: 10, endSec: 11 },
              { text: "precisely", startSec: 12, endSec: 13 },
            ],
          }),
        ]}
        currentSourceSec={0}
        onSeek={onSeek}
      />,
    );

    fireEvent.click(screen.getByText("precisely"));
    expect(onSeek).toHaveBeenCalledWith(12);
  });

  it("shows empty state when there are no segments", () => {
    render(
      <CutTranscriptPanel
        segments={[]}
        currentSourceSec={0}
        onSeek={() => undefined}
      />,
    );

    expect(screen.getByText("transcriptEmpty")).toBeInTheDocument();
    expect(screen.queryByTestId("cut-transcript")).not.toBeInTheDocument();
  });
});
