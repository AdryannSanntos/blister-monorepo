"use client";

import { ArrowLeft, GalleryHorizontal } from "lucide-react";
import { redirect } from "next/navigation";

import { CarouselContentStep } from "src/core/modules/agents/components/carousel/carousel-content-step";
import { CarouselDesignPlanStep } from "src/core/modules/agents/components/carousel/carousel-design-plan-step";
import { CarouselIdeasStep } from "src/core/modules/agents/components/carousel/carousel-ideas-step";
import { CarouselPreviewStep } from "src/core/modules/agents/components/carousel/carousel-preview-step";
import { CarouselRunModalProvider, useCarouselRunModalActions } from "src/core/modules/agents/components/carousel/carousel-run-modal-provider";
import { useCarouselRunDetail } from "src/core/modules/agents/hooks/use-carousel-run-detail";
import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { Button } from "src/core/shared/components/ui/button";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Link } from "@/i18n/routing";

type PhaseWrapperProps = {
  label: string;
  status: "idle" | "processing" | "awaiting_action" | "completed" | "error";
  children: React.ReactNode;
};

const PhaseWrapper = ({ label, status, children }: PhaseWrapperProps) => {
  if (status === "idle") return null;

  return (
    <section
      className={[
        "flex flex-col gap-4 rounded-[var(--r-xl)] border p-6 transition-all duration-300",
        status === "awaiting_action"
          ? "border-[var(--accent)] bg-[color-mix(in_oklch,var(--accent)_4%,var(--bg-base))]"
          : status === "completed"
            ? "border-[var(--line-soft)] bg-[var(--bg-base)] opacity-80"
            : "border-[var(--line-default)] bg-[var(--bg-base)]",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <Paragraph size="p6" tone="tertiary" className="font-semibold uppercase tracking-wide">
          {label}
        </Paragraph>
      </div>
      {children}
    </section>
  );
};

const CarouselRunDetailContent = ({ runId }: { runId: string }) => {
  const { ideas, content, design, preview, actions } = useCarouselRunDetail(runId);
  const { handleOpen: openNewCarouselModal } = useCarouselRunModalActions();

  return (
    <div className="flex flex-col gap-6" data-testid="carousel-run-detail-page">
      <PhaseWrapper label="Escolha de ideia" status={ideas.status}>
        <CarouselIdeasStep
          status={ideas.status}
          ideas={ideas.data}
          selectedId={ideas.selectedId}
          onSelect={actions.selectIdea}
        />
      </PhaseWrapper>

      <PhaseWrapper label="Conteúdo dos slides" status={content.status}>
        <CarouselContentStep
          status={content.status}
          slides={content.data}
          onApprove={actions.approveContent}
          onReject={actions.rejectContent}
        />
      </PhaseWrapper>

      <PhaseWrapper label="Plano de design" status={design.status}>
        <CarouselDesignPlanStep
          status={design.status}
          plan={design.data}
          imageUploads={design.imageUploads}
          onImageUpload={actions.setImageUpload}
          onApprove={actions.approveDesign}
          onReject={actions.rejectDesign}
        />
      </PhaseWrapper>

      <PhaseWrapper label="Preview e exportação" status={preview.status}>
        <CarouselPreviewStep
          status={preview.status}
          output={preview.data}
          isExporting={preview.isExporting}
          onExport={actions.requestExport}
          onNewCarousel={openNewCarouselModal}
        />
      </PhaseWrapper>
    </div>
  );
};

type Props = { agentSlug: string; runId: string };

export const CarouselRunDetailPage = ({ agentSlug, runId }: Props) => {
  const agent = getAgentByRouteSlug(agentSlug);
  if (!agent) redirect("/dashboard");

  return (
    <CarouselRunModalProvider>
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
    </CarouselRunModalProvider>
  );
};
