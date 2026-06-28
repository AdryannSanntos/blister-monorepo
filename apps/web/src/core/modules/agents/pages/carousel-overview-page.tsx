"use client";

import { GalleryHorizontal } from "lucide-react";

import { CarouselRunModalProvider } from "src/core/modules/agents/components/carousel/carousel-run-modal-provider";
import { CarouselRunsGrid } from "src/core/modules/agents/components/carousel/carousel-runs-grid";
import { AgentNewRunButton } from "src/core/modules/agents/components/agent-new-run-button";
import { AgentOverviewStats } from "src/core/modules/agents/components/agent-overview-stats";
import { useCarouselRuns, useCarouselOverviewStats } from "src/core/modules/agents/hooks/use-carousel-runs";
import { CAROUSEL_TEMPLATES_FIXTURE } from "src/core/modules/blister-os/fixtures/carousel-templates.fixture";
import { EmptyState } from "src/core/shared/components/ui/empty-state";
import { Button } from "src/core/shared/components/ui/button";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Link } from "@/i18n/routing";

const NoTemplatesState = () => (
  <EmptyState
    icon={GalleryHorizontal}
    title="Nenhum template de carrossel"
    description="Resgate um template no Marketplace para começar a gerar carrosséis."
    action={
      <Button asChild size="sm">
        <Link href="/dashboard/marketplace">Ver templates no Marketplace</Link>
      </Button>
    }
  />
);

type Props = { agentSlug: string };

const CarouselOverviewContent = () => {
  const { data, isLoading } = useCarouselRuns();
  const stats = useCarouselOverviewStats();
  const hasTemplates = CAROUSEL_TEMPLATES_FIXTURE.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <AgentOverviewStats
        totalRuns={stats.totalRuns}
        completedRuns={stats.completedRuns}
        approvedRuns={stats.approvedRuns}
        creditsUsed={stats.creditsUsed}
      />
      {!hasTemplates ? (
        <NoTemplatesState />
      ) : (
        <CarouselRunsGrid runs={data?.runs ?? []} isLoading={isLoading} />
      )}
    </div>
  );
};

export const CarouselOverviewPage = ({ agentSlug }: Props) => (
  <CarouselRunModalProvider>
    <div data-testid="carousel-overview-page" data-agent={agentSlug}>
      <PageLayout
        icon={GalleryHorizontal}
        title="Carrossel"
        description="Transforme um tema em slides prontos para postar no Instagram."
        actions={<AgentNewRunButton routeSlug={agentSlug} size="sm" />}
      >
        <CarouselOverviewContent />
      </PageLayout>
    </div>
  </CarouselRunModalProvider>
);
