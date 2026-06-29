import type { AgentRunStatusDto } from "@company-os/types";
import { describe, expect, it } from "vitest";

import {
  getFirstCarouselSlideFromRun,
  getCarouselSlideReactKey,
  normalizeCarouselOutput,
  toCarouselViewableRun,
} from "./carousel-run-display";

const baseRun = (
  overrides: Partial<AgentRunStatusDto> = {},
): AgentRunStatusDto => ({
  id: "run_1",
  agentId: "carousel",
  companyId: "ws_1",
  status: "COMPLETED",
  currentStepKey: null,
  inputPayload: {
    theme: "Morning habits",
    templateId: "editorial-performance",
    slidesCount: 2,
  },
  outputPayload: {},
  errorMessage: null,
  pauseReason: null,
  pauseFormSchema: null,
  reviewStatus: null,
  creditCost: 1,
  createdAt: "2026-06-01T10:00:00.000Z",
  startedAt: "2026-06-01T10:00:01.000Z",
  completedAt: "2026-06-01T10:05:00.000Z",
  ...overrides,
});

describe("getFirstCarouselSlideFromRun", () => {
  it("returns null when run is not completed", () => {
    const run = baseRun({ status: "RUNNING" });
    expect(getFirstCarouselSlideFromRun({ run })).toBeNull();
  });

  it("returns the lowest-order slide from completed output", () => {
    const run = baseRun({
      outputPayload: {
        templateId: "editorial-performance",
        socialNetwork: "instagram",
        slides: [
          {
            id: "slide_2",
            order: 2,
            type: "text",
            htmlContent: "<div>Second</div>",
            cssContent: ".slide {}",
          },
          {
            id: "slide_1",
            order: 1,
            type: "start",
            htmlContent: "<div>First</div>",
            cssContent: ".slide {}",
          },
        ],
      },
    });

    expect(getFirstCarouselSlideFromRun({ run })?.id).toBe("slide_1");
  });
});

describe("toCarouselViewableRun", () => {
  it("includes firstSlide for completed runs", () => {
    const viewable = toCarouselViewableRun(
      baseRun({
        outputPayload: {
          templateId: "editorial-performance",
          socialNetwork: "instagram",
          slides: [
            {
              id: "slide_1",
              order: 1,
              type: "start",
              htmlContent: "<div>Cover</div>",
              cssContent: ".slide {}",
            },
          ],
        },
      }),
    );

    expect(viewable.firstSlide?.htmlContent).toBe("<div>Cover</div>");
    expect(viewable.theme).toBe("Morning habits");
  });
});

describe("normalizeCarouselOutput", () => {
  it("dedupes slides with duplicate ids", () => {
    const normalized = normalizeCarouselOutput({
      templateId: "editorial-performance",
      socialNetwork: "instagram",
      slides: [
        {
          id: "slide_1",
          order: 2,
          type: "text",
          htmlContent: "<div>Duplicate</div>",
          cssContent: ".slide {}",
        },
        {
          id: "slide_1",
          order: 1,
          type: "start",
          htmlContent: "<div>Cover</div>",
          cssContent: ".slide {}",
        },
      ],
    });

    expect(normalized.slides).toHaveLength(1);
    expect(normalized.slides[0]?.order).toBe(1);
    expect(normalized.slides[0]?.htmlContent).toBe("<div>Cover</div>");
  });

  it("builds stable react keys from slide id, order and index", () => {
    const slide = {
      id: "slide_1",
      order: 1,
      type: "start" as const,
      htmlContent: "",
      cssContent: "",
    };

    expect(getCarouselSlideReactKey(slide, 0)).toBe("slide_1::1::0");
  });
});
