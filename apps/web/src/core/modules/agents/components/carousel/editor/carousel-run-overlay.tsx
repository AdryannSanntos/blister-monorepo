"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

import { CarouselContentApprovalStep } from "src/core/modules/agents/components/carousel/carousel-content-approval-step";
import { CarouselIdeasStep } from "src/core/modules/agents/components/carousel/carousel-ideas-step";
import { useCarouselRunDetail } from "src/core/modules/agents/hooks/use-carousel-run-detail";
import { useResumeAgentRun } from "src/core/modules/agents/hooks/use-agent-run-mutations";
import { Button } from "src/core/shared/components/ui/button";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

import { CarouselEditorShell } from "./carousel-editor-shell";
import { CarouselPipelineProgress } from "./carousel-pipeline-progress";

const LEGACY_PAUSE_REASONS = new Set([
  "awaiting_design_approval",
]);

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

type Props = {
  runId: string;
  onClose: () => void;
};

export const CarouselRunOverlay = ({ runId, onClose }: Props) => {
  const [mounted, setMounted] = useState(false);
  const detail = useCarouselRunDetail(runId);
  const resumeRun = useResumeAgentRun(runId, "carousel");
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFocusedRef = useRef(false);
  const previousRunIdRef = useRef(runId);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !containerRef.current) return;
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, []);

  // Move focus inside the dialog once it has content, so the Tab trap above
  // is active immediately without requiring a manual Tab first. Guarded by
  // hasFocusedRef so later re-renders (e.g. run status polling) don't steal
  // focus away from whatever the user is interacting with. The overlay is
  // not remounted when navigating between runs (no `key={runId}` upstream),
  // so we detect a `runId` change ourselves (via previousRunIdRef) and reset
  // the guard before checking it, letting focus be reapplied for the new run.
  useEffect(() => {
    if (previousRunIdRef.current !== runId) {
      previousRunIdRef.current = runId;
      hasFocusedRef.current = false;
    }
    if (!mounted || detail.isLoading || !detail.run || hasFocusedRef.current) return;
    const focusable = containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusable?.[0];
    if (first) {
      hasFocusedRef.current = true;
      first.focus();
    }
  });

  if (!mounted || detail.isLoading || !detail.run) return null;

  const isLegacyPause =
    detail.run.status === "PAUSED" &&
    detail.run.pauseReason &&
    LEGACY_PAUSE_REASONS.has(detail.run.pauseReason);

  const handleLegacyContinue = async () => {
    await resumeRun.mutateAsync({
      formData: {
        contentApproved: true,
        designApproved: true,
        imageUploads: {},
      },
    });
  };

  const renderBody = () => {
    if (isLegacyPause) {
      return (
        <div className="flex size-full flex-col items-center justify-center gap-4 p-6 text-center">
          <Paragraph size="p4" className="font-medium text-[var(--fg-primary)]">
            Esta execução usa o fluxo anterior
          </Paragraph>
          <Paragraph size="p5" tone="secondary">
            Toque em continuar para seguir com o pipeline automático.
          </Paragraph>
          <Button type="button" onClick={handleLegacyContinue}>
            Continuar
          </Button>
        </div>
      );
    }

    if (detail.phases.ideas.status === "awaiting_action") {
      return (
        <div className="flex size-full items-center justify-center overflow-y-auto p-6">
          <div className="w-full max-w-2xl">
            <CarouselIdeasStep
              status={detail.ideas.status}
              ideas={detail.ideas.data}
              selectedId={detail.ideas.selectedId}
              onSelect={detail.actions.selectIdea}
              onUpdateSelection={detail.actions.updateIdeaSelection}
              onSubmitCustomIdea={detail.actions.submitCustomIdea}
            />
          </div>
        </div>
      );
    }

    if (detail.phases.editor.status === "awaiting_action" && detail.content.slides.length > 0) {
      return (
        <CarouselContentApprovalStep
          slides={detail.content.slides}
          isApproving={detail.content.isApproving}
          onApprove={detail.actions.approveContent}
        />
      );
    }

    if (detail.editor.status === "completed" && detail.editor.data) {
      // No explicit `reset()` is needed here on close/unmount: `runId` is not
      // used as a React `key`, so switching runs while this overlay stays
      // mounted (or unmounting/remounting for a different run) both funnel
      // through `CarouselEditorShell`'s own `runId`-keyed effect, which resets
      // the (global, singleton) editor store before applying the new run's
      // slides. Adding a second reset here would be redundant.
      return (
        <CarouselEditorShell runId={runId} output={detail.editor.data} onClose={onClose} />
      );
    }

    return (
      <div className="flex size-full items-center justify-center">
        <CarouselPipelineProgress
          currentStepKey={detail.run?.currentStepKey ?? null}
          completed={detail.editor.status === "completed"}
        />
      </div>
    );
  };

  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      data-testid="carousel-run-overlay"
      className="fixed inset-0 z-[100] bg-[var(--bg-base)]"
    >
      {renderBody()}
    </div>,
    document.body,
  );
};
