"use client";

import { GalleryHorizontal } from "lucide-react";

import { CarouselRunsGrid } from "src/core/modules/agents/components/carousel/carousel-runs-grid";
import { AgentNewRunButton } from "src/core/modules/agents/components/agent-new-run-button";
import { AgentOverviewStats } from "src/core/modules/agents/components/agent-overview-stats";
import { useCarouselRuns, useCarouselOverviewStats } from "src/core/modules/agents/hooks/use-carousel-runs";
import { useCarouselTemplates } from "src/core/shared/hooks/use-carousel-templates";
import { toCarouselViewableRun } from "src/core/modules/agents/utils/carousel-run-display";
import { EmptyState } from "src/core/shared/components/ui/empty-state";
import { Button } from "src/core/shared/components/ui/button";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Link } from "@/i18n/routing";
import { useMemo } from "react";

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
  const { data, isLoading } = useCarouselRuns({
    limit: 50,
    pollWhileProcessing: true,
  });
  const stats = useCarouselOverviewStats();
  const { data: templates = [], isLoading: templatesLoading } =
    useCarouselTemplates();

  const viewableRuns = useMemo(
    () => (data?.runs ?? []).map(toCarouselViewableRun),
    [data?.runs],
  );

  const hasTemplates = templates.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <AgentOverviewStats
        totalRuns={stats.totalRuns}
        completedRuns={stats.completedRuns}
        approvedRuns={stats.approvedRuns}
        creditsUsed={stats.creditsUsed}
      />
      {templatesLoading ? null : !hasTemplates ? (
        <NoTemplatesState />
      ) : (
        <CarouselRunsGrid runs={viewableRuns} isLoading={isLoading} />
      )}
    </div>
  );
};

export const CarouselOverviewPage = ({ agentSlug }: Props) => (
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
);
