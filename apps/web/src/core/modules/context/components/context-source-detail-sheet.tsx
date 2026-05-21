"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Loader2,
  PenLine,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PermissionGate } from "src/core/shared/components/permission-gate";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "src/core/shared/components/ui/sheet";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { cn } from "src/core/shared/utils";
import type {
  ContextPipelineStatus,
  ContextSource,
} from "../hooks/use-context-sources";
import {
  useDeleteContextSource,
  useReviewContextSource,
} from "../hooks/use-context-sources";
import { ContextSourcePreviewDialog } from "./context-source-preview-dialog";

// ─── constants ────────────────────────────────────────────────────────────────

const PIPELINE_STEPS: { status: ContextPipelineStatus; label: string }[] = [
  { status: "pending", label: "Aguardando" },
  { status: "ingesting", label: "Ingestão" },
  { status: "extracting", label: "Extração" },
  { status: "review", label: "Revisão" },
  { status: "approved", label: "Aprovado" },
];

const STATUS_CONFIGS: Record<
  ContextPipelineStatus,
  { label: string; variant: "secondary" | "success" | "destructive" | "warning"; spin: boolean }
> = {
  pending:    { label: "Aguardando", variant: "secondary",    spin: true  },
  ingesting:  { label: "Ingestão",   variant: "secondary",    spin: true  },
  extracting: { label: "Extraindo",  variant: "secondary",    spin: true  },
  review:     { label: "Revisão",    variant: "warning",      spin: false },
  approved:   { label: "Aprovado",   variant: "success",      spin: false },
  rejected:   { label: "Rejeitado",  variant: "secondary",    spin: false },
  error:      { label: "Erro",       variant: "destructive",  spin: false },
};

const KIND_ICONS: Record<ContextSource["sourceKind"], React.ElementType> = {
  file: FileText,
  url: Globe,
  manual: PenLine,
};

const KIND_LABELS: Record<ContextSource["sourceKind"], string> = {
  file: "Arquivo",
  url: "URL",
  manual: "Manual",
};

// ─── pipeline track ───────────────────────────────────────────────────────────

function PipelineTrack({ status }: { status: ContextPipelineStatus }) {
  const activeIndex =
    status === "approved" || status === "rejected"
      ? PIPELINE_STEPS.length - 1
      : PIPELINE_STEPS.findIndex((s) => s.status === status);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {PIPELINE_STEPS.map((step, i) => {
        const isActive = i === activeIndex;
        const isDone = i < activeIndex;
        return (
          <div key={step.status} className="flex items-center gap-1">
            <div
              className={cn(
                "flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium transition-colors",
                isDone && "bg-[var(--success-soft,#16a34a18)] text-[var(--success,#16a34a)]",
                isActive && status !== "rejected" && status !== "error" && "bg-[var(--accent-soft-lo)] text-[var(--accent)]",
                isActive && status === "rejected" && "bg-[var(--bg-hover)] text-[var(--fg-secondary)]",
                isActive && status === "error" && "bg-[var(--danger-soft,#dc262618)] text-[var(--danger)]",
                !isDone && !isActive && "bg-[var(--bg-hover)] text-[var(--fg-quaternary)]",
              )}
            >
              {step.label}
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <ChevronRight
                className={cn(
                  "size-3 shrink-0",
                  isDone ? "text-[var(--success,#16a34a)]" : "text-[var(--fg-quaternary)]",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── review schema ────────────────────────────────────────────────────────────

const reviewSchema = z.object({
  reviewNotes: z.string().trim().max(1000).optional(),
});
type ReviewValues = z.infer<typeof reviewSchema>;

// ─── main sheet ───────────────────────────────────────────────────────────────

type Props = {
  orgId: string | null;
  source: ContextSource | null;
  onClose: () => void;
};

export function ContextSourceDetailSheet({ orgId, source, onClose }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const review = useReviewContextSource(orgId);
  const del = useDeleteContextSource(orgId);

  const reviewForm = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { reviewNotes: source?.reviewNotes ?? "" },
  });

  if (!source) return null;

  const KindIcon = KIND_ICONS[source.sourceKind];
  const statusCfg = STATUS_CONFIGS[source.pipelineStatus];
  const StatusIcon = statusCfg.spin ? Loader2 : (
    source.pipelineStatus === "approved" ? CheckCircle2 :
    source.pipelineStatus === "error" ? AlertCircle :
    source.pipelineStatus === "rejected" ? XCircle : AlertCircle
  );
  const isReviewable = source.pipelineStatus === "review";
  const fileExtractedContent = source.normalizedContent ?? source.extractedContent;
  const manualContent = source.normalizedContent ?? source.extractedContent ?? source.description;
  const hasPreview =
    (source.sourceKind === "url" && Boolean(source.sourceUrl)) ||
    (source.sourceKind === "file" && (Boolean(source.publicUrl) || Boolean(fileExtractedContent))) ||
    (source.sourceKind === "manual" && Boolean(manualContent));

  async function handleReview(decision: "approve" | "reject") {
    const { reviewNotes } = reviewForm.getValues();
    await review.mutateAsync({ sourceId: source!.id, decision, reviewNotes });
    onClose();
  }

  async function handleDelete() {
    await del.mutateAsync(source!.id);
    onClose();
  }

  return (
    <>
    <Sheet open={Boolean(source)} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        {/* ── header ── */}
        <SheetHeader className="border-b border-[var(--line-subtle)] px-6 py-4 pr-14">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-sunken)]">
              <KindIcon className="size-4 text-[var(--fg-tertiary)]" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-[15px] text-[var(--fg-primary)]">
                {source.title}
              </SheetTitle>
              <div className="mt-1 flex items-center gap-2">
                <SheetDescription className="text-[12px] text-[var(--fg-tertiary)]">
                  {KIND_LABELS[source.sourceKind]}
                </SheetDescription>
                <Badge variant={statusCfg.variant} className="h-5 gap-1 px-1.5 py-0 text-[10px]">
                  <StatusIcon className={cn("size-2.5", statusCfg.spin && "animate-spin")} />
                  {statusCfg.label}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* ── body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 py-5">

            {/* pipeline */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--fg-quaternary)]">
                Pipeline
              </p>
              <PipelineTrack status={source.pipelineStatus} />
              {source.pipelineError && (
                <p className="text-[12px] text-[var(--danger)]">{source.pipelineError}</p>
              )}
            </div>

            {/* origin */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--fg-quaternary)]">
                Origem
              </p>
              {source.sourceUrl ? (
                <a
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 break-all text-[13px] text-[var(--accent)] hover:underline"
                >
                  <ExternalLink className="size-3.5 shrink-0" />
                  {source.sourceUrl}
                </a>
              ) : source.fileName ? (
                <span className="text-[13px] text-[var(--fg-primary)]">{source.fileName}</span>
              ) : (
                <span className="text-[13px] text-[var(--fg-tertiary)]">Entrada manual</span>
              )}
            </div>

            {/* preview button */}
            {hasPreview && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-[13px]"
                onClick={() => setPreviewDialogOpen(true)}
              >
                <Eye className="size-3.5" />
                Visualizar conteúdo
              </Button>
            )}

            {/* review action */}
            {isReviewable && (
              <PermissionGate permission="context.review">
                <div className="space-y-3 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-sunken)] p-4">
                  <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                    Esta fonte aguarda revisão
                  </p>
                  <Form {...reviewForm}>
                    <FormField
                      control={reviewForm.control}
                      name="reviewNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px] text-[var(--fg-tertiary)]">
                            Notas de revisão{" "}
                            <span className="text-[var(--fg-quaternary)]">(opcional)</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea rows={2} placeholder="Observações sobre esta fonte…" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </Form>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--danger)]/5"
                      onClick={() => handleReview("reject")}
                      disabled={review.isPending}
                    >
                      {review.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <XCircle className="size-3.5" />
                      )}
                      Rejeitar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleReview("approve")}
                      disabled={review.isPending}
                    >
                      {review.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3.5" />
                      )}
                      Aprovar
                    </Button>
                  </div>
                </div>
              </PermissionGate>
            )}

            {/* review notes after decision */}
            {!isReviewable && source.reviewNotes && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--fg-quaternary)]">
                  Notas da revisão
                </p>
                <p className="text-[13px] text-[var(--fg-secondary)]">{source.reviewNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── footer ── */}
        <div className="border-t border-[var(--line-subtle)] px-6 py-4">
          <PermissionGate permission="context.delete">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <p className="flex-1 text-[13px] text-[var(--fg-tertiary)]">Confirmar exclusão?</p>
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={del.isPending}
                >
                  {del.isPending && <Loader2 className="size-3.5 animate-spin" />}
                  Excluir
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="text-[var(--fg-tertiary)] hover:text-[var(--danger)]"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-3.5" />
                Remover fonte
              </Button>
            )}
          </PermissionGate>
        </div>
      </SheetContent>
    </Sheet>

    {previewDialogOpen && (
      <ContextSourcePreviewDialog
        source={source}
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
      />
    )}
  </>
  );
}
