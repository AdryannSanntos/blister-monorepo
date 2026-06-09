"use client";

import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconPencil,
  IconRefresh,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { Markdown } from "@/components/agent-elements/markdown";
import type { CustomToolRendererProps } from "@/components/agent-elements/types";
import { cn } from "@/components/agent-elements/utils/cn";
import { Button } from "@/core/shared/components/ui/button";

function readMarkdown(
  input: CustomToolRendererProps["input"],
  output: CustomToolRendererProps["output"],
): string {
  if (
    typeof output === "object" &&
    output &&
    "markdown" in output &&
    typeof (output as { markdown?: unknown }).markdown === "string"
  ) {
    return (output as { markdown: string }).markdown;
  }
  return typeof input?.markdown === "string" ? input.markdown : "";
}

/**
 * The agent answer, rendered as an assistant bubble so it sits in the same
 * visual language as user/assistant messages — branded surface, soft border,
 * sparkle eyebrow, fade-in.
 */
function ResultBubble({
  markdown,
  label,
  streaming,
}: {
  markdown: string;
  label: string;
  streaming?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-an-message border border-[var(--line-subtle)] bg-[var(--bg-base)]">
      <div className="flex items-center gap-1.5 px-5 pt-3">
        <IconSparkles className="size-3.5 shrink-0 text-[var(--accent)]" />
        <span className="text-xs font-medium text-[var(--fg-tertiary)]">
          {label}
        </span>
        {streaming ? (
          <span className="an-text-shimmer an-text-shimmer--active text-xs">
            …
          </span>
        ) : null}
      </div>
      <div className="px-5 pb-4 pt-2 text-[14px] text-[var(--fg-primary)]">
        {markdown ? (
          <Markdown content={markdown} />
        ) : (
          <p className="text-sm italic text-[var(--fg-quaternary)]">
            Sem conteúdo gerado.
          </p>
        )}
      </div>
    </div>
  );
}

export const BlisterOutputRenderer = memo(function BlisterOutputRenderer({
  input,
  output,
  status,
}: CustomToolRendererProps) {
  const t = useTranslations("agents.review");
  const markdown = readMarkdown(input, output);
  const streaming = status === "pending" || status === "streaming";

  if (!markdown && !streaming) return null;

  return (
    <div className="flex animate-in fade-in slide-in-from-bottom-1 duration-[var(--dur-base)]">
      <div className="w-full max-w-[88%]">
        <ResultBubble
          markdown={markdown}
          label={t("title")}
          streaming={streaming}
        />
      </div>
    </div>
  );
});

type BlisterReviewInput = {
  markdown?: string;
  reviewStatus?: string | null;
  canEdit?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
};

function StatusPill({ status, label }: { status: string; label: string }) {
  const tone =
    status === "APPROVED"
      ? "border-[color-mix(in_oklch,var(--success)_40%,transparent)] bg-[color-mix(in_oklch,var(--success)_12%,transparent)] text-[var(--success)]"
      : status === "REJECTED"
        ? "border-[color-mix(in_oklch,var(--danger)_40%,transparent)] bg-[color-mix(in_oklch,var(--danger)_12%,transparent)] text-[var(--danger)]"
        : "border-[var(--line-default)] bg-[var(--bg-raised)] text-[var(--fg-secondary)]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--r-full)] border px-3 py-1 text-xs font-medium",
        tone,
      )}
    >
      {status === "APPROVED" ? (
        <IconCheck className="size-3.5" />
      ) : status === "REJECTED" ? (
        <IconX className="size-3.5" />
      ) : (
        <IconPencil className="size-3.5" />
      )}
      {label}
    </span>
  );
}

export const BlisterReviewRenderer = memo(function BlisterReviewRenderer({
  input,
  output,
}: CustomToolRendererProps) {
  const t = useTranslations("agents.review");
  const reviewInput = (input ?? {}) as BlisterReviewInput;
  const markdown = reviewInput.markdown || readMarkdown(input, output);

  const reviewStatus = reviewInput.reviewStatus;
  const isClosed =
    reviewStatus === "APPROVED" ||
    reviewStatus === "REJECTED" ||
    reviewStatus === "EDITED";

  const statusLabel =
    reviewStatus === "APPROVED"
      ? t("approvedMessage")
      : reviewStatus === "REJECTED"
        ? t("rejectedMessage")
        : t("editSuccess");

  return (
    <div className="flex animate-in fade-in slide-in-from-bottom-1 duration-[var(--dur-base)]">
      <div className="flex w-full max-w-[88%] flex-col gap-3">
        <ResultBubble markdown={markdown} label={t("title")} />

        {isClosed ? (
          <StatusPill status={reviewStatus as string} label={statusLabel} />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={reviewInput.onApprove}>
              <IconCheck className="size-4" />
              {t("approve")}
            </Button>
            <Button size="sm" variant="outline" onClick={reviewInput.onReject}>
              <IconX className="size-4" />
              {t("reject")}
            </Button>
            {reviewInput.canEdit ? (
              <Button size="sm" variant="ghost" onClick={reviewInput.onEdit}>
                <IconPencil className="size-4" />
                {t("edit")}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={reviewInput.onRegenerate}
            >
              <IconRefresh className="size-4" />
              {t("regenerate")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});

const DEFAULT_POST_WIDTH = 1080;
const DEFAULT_POST_HEIGHT = 1350;

type BlisterPostInput = {
  slides?: Array<{ html?: unknown }>;
  platform?: string;
  format?: string;
  width?: number;
  height?: number;
  caption?: string;
  hashtags?: string[];
  reviewStatus?: string | null;
  canReview?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
};

/**
 * Renders a single slide's HTML inside a sandboxed iframe at the platform's
 * real dimensions, scaled down (never up) to fit the chat bubble while keeping
 * the exact aspect ratio. `sandbox=""` blocks scripts/forms but still renders
 * HTML, CSS and images.
 */
function SlidePreview({
  html,
  width,
  height,
}: {
  html: string;
  width: number;
  height: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => setContainerWidth(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scale = containerWidth > 0 ? Math.min(1, containerWidth / width) : 0;

  return (
    <div ref={containerRef} className="flex w-full justify-center">
      {scale > 0 ? (
        <div
          className="relative overflow-hidden rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-white"
          style={{ width: width * scale, height: height * scale }}
        >
          <iframe
            title="Pré-visualização do post"
            sandbox=""
            srcDoc={html}
            style={{
              width,
              height,
              border: "none",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export const BlisterPostRenderer = memo(function BlisterPostRenderer({
  input,
}: CustomToolRendererProps) {
  const t = useTranslations("agents.review");
  const tp = useTranslations("agents.postPreview");
  const data = (input ?? {}) as BlisterPostInput;

  const slides = (data.slides ?? []).flatMap((slide) =>
    typeof slide?.html === "string" && slide.html.trim().length > 0
      ? [slide.html]
      : [],
  );
  const total = slides.length;
  const width = data.width && data.width > 0 ? data.width : DEFAULT_POST_WIDTH;
  const height =
    data.height && data.height > 0 ? data.height : DEFAULT_POST_HEIGHT;
  const hashtags = data.hashtags ?? [];

  const [current, setCurrent] = useState(0);
  const [copied, setCopied] = useState(false);

  const safeIndex = Math.min(current, Math.max(0, total - 1));

  const handleCopy = useCallback(() => {
    const html = slides[safeIndex];
    if (!html) return;
    void navigator.clipboard?.writeText(html);
    setCopied(true);
  }, [safeIndex, slides]);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  const reviewStatus = data.reviewStatus;
  const isClosed =
    reviewStatus === "APPROVED" ||
    reviewStatus === "REJECTED" ||
    reviewStatus === "EDITED";
  const statusLabel =
    reviewStatus === "APPROVED"
      ? t("approvedMessage")
      : reviewStatus === "REJECTED"
        ? t("rejectedMessage")
        : t("editSuccess");

  if (total === 0) return null;

  const navButtonClass =
    "inline-flex size-7 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-default)] text-[var(--fg-secondary)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex animate-in fade-in slide-in-from-bottom-1 duration-[var(--dur-base)]">
      <div className="flex w-full max-w-[88%] flex-col gap-3">
        <div className="overflow-hidden rounded-an-message border border-[var(--line-subtle)] bg-[var(--bg-base)]">
          <div className="flex items-center justify-between gap-2 px-5 pt-3">
            <div className="flex items-center gap-1.5">
              <IconSparkles className="size-3.5 shrink-0 text-[var(--accent)]" />
              <span className="text-xs font-medium text-[var(--fg-tertiary)]">
                {[data.platform, `${width}×${height}`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-[var(--r-md)] px-2 py-1 text-xs font-medium text-[var(--fg-tertiary)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-secondary)]"
            >
              {copied ? (
                <IconCheck className="size-3.5" />
              ) : (
                <IconCopy className="size-3.5" />
              )}
              {copied ? tp("copied") : tp("copyHtml")}
            </button>
          </div>

          <div className="px-5 pb-3 pt-2">
            <SlidePreview
              html={slides[safeIndex]}
              width={width}
              height={height}
            />

            {total > 1 ? (
              <div className="mt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrent((value) => Math.max(0, value - 1))}
                  disabled={safeIndex === 0}
                  className={navButtonClass}
                  aria-label={tp("previousSlide")}
                >
                  <IconChevronLeft className="size-4" />
                </button>
                <span className="text-xs font-medium text-[var(--fg-tertiary)]">
                  {tp("slideCounter", {
                    current: safeIndex + 1,
                    total,
                  })}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrent((value) => Math.min(total - 1, value + 1))
                  }
                  disabled={safeIndex >= total - 1}
                  className={navButtonClass}
                  aria-label={tp("nextSlide")}
                >
                  <IconChevronRight className="size-4" />
                </button>
              </div>
            ) : null}
          </div>

          {data.caption || hashtags.length > 0 ? (
            <div className="border-t border-[var(--line-subtle)] px-5 py-3 text-[14px] text-[var(--fg-primary)]">
              {data.caption ? (
                <p className="whitespace-pre-wrap">{data.caption}</p>
              ) : null}
              {hashtags.length > 0 ? (
                <p className="mt-2 text-[13px] text-[var(--accent)]">
                  {hashtags
                    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
                    .join(" ")}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {data.canReview && !isClosed ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={data.onApprove}>
              <IconCheck className="size-4" />
              {t("approve")}
            </Button>
            <Button size="sm" variant="outline" onClick={data.onReject}>
              <IconX className="size-4" />
              {t("reject")}
            </Button>
            <Button size="sm" variant="ghost" onClick={data.onEdit}>
              <IconPencil className="size-4" />
              {t("edit")}
            </Button>
            <Button size="sm" variant="ghost" onClick={data.onRegenerate}>
              <IconRefresh className="size-4" />
              {t("regenerate")}
            </Button>
          </div>
        ) : isClosed ? (
          <StatusPill status={reviewStatus as string} label={statusLabel} />
        ) : null}
      </div>
    </div>
  );
});

export const BLISTER_TOOL_RENDERERS = {
  BlisterOutput: BlisterOutputRenderer,
  BlisterReview: BlisterReviewRenderer,
  BlisterPost: BlisterPostRenderer,
};
