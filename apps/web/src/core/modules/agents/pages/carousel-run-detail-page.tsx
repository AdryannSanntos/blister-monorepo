"use client";

import { ArrowLeft, GalleryHorizontal } from "lucide-react";
import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";

import { CarouselContentStep } from "src/core/modules/agents/components/carousel/carousel-content-step";
import { CarouselDesignPlanStep } from "src/core/modules/agents/components/carousel/carousel-design-plan-step";
import { CarouselIdeasStep } from "src/core/modules/agents/components/carousel/carousel-ideas-step";
import { CarouselPreviewStep } from "src/core/modules/agents/components/carousel/carousel-preview-step";
import { CarouselRunStepper } from "src/core/modules/agents/components/carousel/carousel-run-stepper";
import {
  getCarouselStepPhaseStatus,
  type CarouselRunStepId,
} from "src/core/modules/agents/components/carousel/carousel-run-steps";
import { CarouselRunDetailPageSkeleton } from "src/core/modules/agents/components/carousel/carousel-step-states";
import { CarouselStepNavigation } from "src/core/modules/agents/components/carousel/carousel-step-navigation";
import { useCarouselRunModalActions } from "src/core/modules/agents/components/carousel/carousel-run-modal-provider";
import { useCarouselRunDetail } from "src/core/modules/agents/hooks/use-carousel-run-detail";
import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { Button } from "src/core/shared/components/ui/button";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { StatusModal } from "src/core/shared/components/ui/status-modal";
import { cn } from "src/core/shared/utils";
import { Link } from "@/i18n/routing";

const STEP_SECTION_LABEL: Record<CarouselRunStepId, string> = {
  ideas: "Escolha de ideia",
  content: "Conteúdo dos slides",
  design: "Plano de design",
  preview: "Preview e exportação",
};

const CarouselRunDetailContent = ({ runId }: { runId: string }) => {
  const t = useTranslations("carousel.runDetail");
  const {
    ideas,
    content,
    design,
    preview,
    activeStep,
    phases,
    navigation,
    actions,
    run,
    phaseErrors,
    isLoading,
    isError,
    errorMessage,
    clearErrorMessage,
  } = useCarouselRunDetail(runId);
  const { handleOpen: openNewCarouselModal } = useCarouselRunModalActions();

  const activePhaseStatus = getCarouselStepPhaseStatus(activeStep, phases);
  const isAwaitingAction = activePhaseStatus === "awaiting_action";
  const isCompleted = activePhaseStatus === "completed";
  const isPhaseError = activePhaseStatus === "error";
  const isLoadingPhase =
    activePhaseStatus === "idle" || activePhaseStatus === "processing";
  const showPrevNav =
    !isAwaitingAction && !isPhaseError && !isLoadingPhase && navigation.canGoPrev;
  const showNextNav = isCompleted && navigation.canGoNext;

  const sharedStepProps = {
    currentStepKey: run?.currentStepKey,
    runStatus: run?.status,
    onNewCarousel: openNewCarouselModal,
  };

  if (isLoading) {
    return <CarouselRunDetailPageSkeleton />;
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-[var(--r-xl)] border border-[var(--danger-soft)] bg-[color-mix(in_oklch,var(--danger)_4%,var(--bg-base))] px-6 py-12 text-center"
        data-testid="carousel-run-detail-error"
        role="alert"
      >
        <Paragraph size="p4" className="font-medium text-[var(--danger)]">
          {t("error.page.title")}
        </Paragraph>
        <Paragraph size="p5" tone="secondary">
          {t("error.page.description")}
        </Paragraph>
      </div>
    );
  }

  const handleCloseActionError = () => {
    clearErrorMessage();
  };

  return (
    <>
      <div className="flex flex-col gap-6" data-testid="carousel-run-detail-page">
        <CarouselRunStepper
          activeStep={activeStep}
          phases={phases}
          onStepChange={navigation.goToStep}
        />

        <section
          className={cn(
            "flex flex-col gap-4 rounded-[var(--r-xl)] border p-6 transition-all duration-300",
            isPhaseError
              ? "border-[var(--danger-soft)] bg-[color-mix(in_oklch,var(--danger)_3%,var(--bg-base))]"
              :             activePhaseStatus === "awaiting_action"
              ? "border-[var(--accent)] bg-[color-mix(in_oklch,var(--accent)_4%,var(--bg-base))]"
              : isLoadingPhase
                ? "border-[var(--line-default)] bg-[var(--bg-subtle)]"
                : activePhaseStatus === "completed"
                  ? "border-[var(--line-soft)] bg-[var(--bg-base)]"
                  : "border-[var(--line-default)] bg-[var(--bg-base)]",
          )}
          data-testid={`carousel-run-step-panel-${activeStep}`}
        >
          <Paragraph
            size="p6"
            tone="tertiary"
            className="font-semibold uppercase tracking-wide"
          >
            {STEP_SECTION_LABEL[activeStep]}
          </Paragraph>

          {activeStep === "ideas" ? (
            <CarouselIdeasStep
              status={ideas.status}
              ideas={ideas.data}
              selectedId={ideas.selectedId}
              reviewMode={ideas.status === "completed"}
              errorMessage={phaseErrors.ideas}
              onSelect={actions.selectIdea}
              onUpdateSelection={actions.updateIdeaSelection}
              {...sharedStepProps}
            />
          ) : null}

          {activeStep === "content" ? (
            <CarouselContentStep
              status={content.status}
              slides={content.data}
              reviewMode={content.status === "completed"}
              errorMessage={phaseErrors.content}
              onApprove={actions.approveContent}
              onUpdate={actions.updateContent}
              onReject={actions.rejectContent}
              {...sharedStepProps}
            />
          ) : null}

          {activeStep === "design" ? (
            <CarouselDesignPlanStep
              status={design.status}
              plan={design.data}
              imageUploads={design.imageUploads}
              reviewMode={design.status === "completed"}
              errorMessage={phaseErrors.design}
              onImageUpload={actions.setImageUpload}
              onApprove={actions.approveDesign}
              onUpdate={actions.updateDesign}
              onReject={actions.rejectDesign}
              {...sharedStepProps}
            />
          ) : null}

          {activeStep === "preview" ? (
            <CarouselPreviewStep
              status={preview.status}
              output={preview.data}
              isExporting={preview.isExporting}
              exportDownloadUrl={preview.exportDownloadUrl}
              errorMessage={phaseErrors.preview}
              onExport={actions.requestExport}
              onNewCarousel={openNewCarouselModal}
              currentStepKey={run?.currentStepKey}
              runStatus={run?.status}
            />
          ) : null}

          {showPrevNav || showNextNav ? (
            <CarouselStepNavigation
              showPrev={showPrevNav}
              showNext={showNextNav}
              onPrev={() => navigation.goToAdjacentStep("prev")}
              onNext={() => navigation.goToAdjacentStep("next")}
            />
          ) : null}
        </section>
      </div>

      <StatusModal
        open={Boolean(errorMessage)}
        variant="error"
        title={t("error.action.title")}
        description={errorMessage ?? t("error.action.description")}
        onClose={handleCloseActionError}
        testId="carousel-run-action-error-modal"
        secondaryAction={{ label: t("error.action.close"), onClick: handleCloseActionError }}
      />
    </>
  );
};

type Props = { agentSlug: string; runId: string };

export const CarouselRunDetailPage = ({ agentSlug, runId }: Props) => {
  const agent = getAgentByRouteSlug(agentSlug);
  if (!agent) redirect("/dashboard");

  return (
    <PageLayout
      icon={GalleryHorizontal}
      title="Execução de Carrossel"
      description="Acompanhe e revise cada etapa da geração."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/agents/${agentSlug}/overview`}>
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </Button>
      }
    >
      <CarouselRunDetailContent runId={runId} />
    </PageLayout>
  );
};
