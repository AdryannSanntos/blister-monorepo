"use client";

import { IconSparkles } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { memo } from "react";

import { Markdown } from "@/components/agent-elements/markdown";
import { Suggestions } from "@/components/agent-elements/input/suggestions";
import { ToolApprovalFooter } from "@/components/agent-elements/tools/tool-approval-footer";
import type { CustomToolRendererProps } from "@/components/agent-elements/types";

export function BlisterOutputRenderer({
  input,
  output,
  status,
}: CustomToolRendererProps) {
  const markdown =
    (typeof output === "object" &&
      output &&
      "markdown" in output &&
      typeof (output as { markdown?: unknown }).markdown === "string" &&
      (output as { markdown: string }).markdown) ||
    (typeof input?.markdown === "string" ? input.markdown : "");

  if (!markdown) return null;

  return (
    <div className="overflow-hidden rounded-an-tool-border-radius border border-border bg-an-tool-background">
      <div className="flex h-7 items-center gap-1.5 border-b border-border px-3">
        <IconSparkles className="size-3.5 shrink-0 text-an-tool-color-muted" />
        <span className="text-xs text-an-tool-color-muted">Resultado</span>
        {status === "pending" || status === "streaming" ? (
          <span className="text-xs text-an-tool-color-muted">Gerando...</span>
        ) : null}
      </div>
      <div className="max-h-[480px] overflow-y-auto px-4 py-3">
        <Markdown content={markdown} />
      </div>
    </div>
  );
}

type BlisterReviewInput = {
  markdown?: string;
  reviewStatus?: string | null;
  canEdit?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
};

export const BlisterReviewRenderer = memo(function BlisterReviewRenderer({
  input,
  output,
}: CustomToolRendererProps) {
  const t = useTranslations("agents.review");
  const reviewInput = (input ?? {}) as BlisterReviewInput;
  const markdown =
    reviewInput.markdown ||
    (typeof output === "object" &&
    output &&
    "markdown" in output &&
    typeof (output as { markdown?: unknown }).markdown === "string"
      ? (output as { markdown: string }).markdown
      : "");

  const reviewStatus = reviewInput.reviewStatus;
  const isClosed =
    reviewStatus === "APPROVED" ||
    reviewStatus === "REJECTED" ||
    reviewStatus === "EDITED";

  return (
    <div className="overflow-hidden rounded-an-tool-border-radius border border-border bg-an-tool-background">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-an-foreground">{t("title")}</p>
        <p className="mt-1 text-xs text-an-tool-color-muted">{t("description")}</p>
      </div>

      {reviewInput.canEdit ? (
        <div className="border-b border-border px-3 py-2">
          <Suggestions
            items={[
              {
                id: "edit",
                label: t("edit"),
              },
              {
                id: "regenerate",
                label: t("regenerate"),
              },
            ]}
            onSelect={(item) => {
              if (item.id === "edit") reviewInput.onEdit?.();
              if (item.id === "regenerate") reviewInput.onRegenerate?.();
            }}
            disabled={isClosed}
          />
        </div>
      ) : (
        <div className="border-b border-border px-3 py-2">
          <Suggestions
            items={[{ id: "regenerate", label: t("regenerate") }]}
            onSelect={() => reviewInput.onRegenerate?.()}
            disabled={isClosed}
          />
        </div>
      )}

      {!isClosed ? (
        <ToolApprovalFooter
          approveLabel={t("approve")}
          rejectLabel={t("reject")}
          onApprove={reviewInput.onApprove}
          onReject={reviewInput.onReject}
        />
      ) : (
        <div className="border-t border-border px-4 py-3 text-xs text-an-tool-color-muted">
          {reviewStatus === "APPROVED"
            ? t("approvedMessage")
            : reviewStatus === "REJECTED"
              ? t("rejectedMessage")
              : t("editSuccess")}
        </div>
      )}

      {markdown ? (
        <div className="max-h-[320px] overflow-y-auto border-t border-border px-4 py-3">
          <Markdown content={markdown} />
        </div>
      ) : null}
    </div>
  );
});

export const BLISTER_TOOL_RENDERERS = {
  BlisterOutput: BlisterOutputRenderer,
  BlisterReview: BlisterReviewRenderer,
};
