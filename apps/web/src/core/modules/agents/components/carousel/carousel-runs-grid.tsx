"use client";

import { GalleryHorizontal } from "lucide-react";

import { AgentNewRunButton } from "src/core/modules/agents/components/agent-new-run-button";
import { CarouselRunCard } from "./carousel-run-card";
import type { CarouselViewableRun } from "src/core/modules/agents/utils/carousel-run-display";
import { Badge } from "src/core/shared/components/ui/badge";
import { EmptyState } from "src/core/shared/components/ui/empty-state";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Skeleton } from "src/core/shared/components/ui/skeleton";

type Props = { runs: CarouselViewableRun[]; isLoading: boolean };

const LoadingGrid = () => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]">
        <Skeleton className="aspect-square w-full rounded-none" />
        <div className="space-y-2 px-3.5 py-3">
          <Skeleton className="h-4 w-[80%]" />
          <Skeleton className="h-3 w-[40%]" />
        </div>
      </div>
    ))}
  </div>
);

export const CarouselRunsGrid = ({ runs, isLoading }: Props) => (
  <section data-testid="carousel-runs-grid" className="flex flex-col gap-4">
    <header className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Heading level="h5" as="h2">Execuções</Heading>
        {!isLoading && (
          <Badge variant="secondary">{runs.length} {runs.length === 1 ? "execução" : "execuções"}</Badge>
        )}
      </div>
      <Paragraph size="p5" tone="tertiary">
        {isLoading ? "Carregando..." : "Histórico de carrosséis gerados"}
      </Paragraph>
    </header>

    {isLoading ? (
      <LoadingGrid />
    ) : runs.length === 0 ? (
      <EmptyState
        icon={GalleryHorizontal}
        title="Nenhum carrossel gerado"
        description="Crie seu primeiro carrossel e ele aparecerá aqui."
        action={<AgentNewRunButton routeSlug="carousel" size="sm" />}
      />
    ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {runs.map((run) => (
          <CarouselRunCard key={run.id} run={run} />
        ))}
      </div>
    )}
  </section>
);
