"use client";

import {
  Clapperboard,
  Coins,
  LayoutDashboard,
  Scissors,
  Sparkles,
  Store,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import { AGENTS_CATALOG } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { getAgentNewPath, getAgentOverviewPath } from "src/core/modules/agents/utils/agent-paths";
import { MARKETPLACE_ITEMS } from "src/core/modules/blister-os/fixtures/marketplace-items.fixture";
import { RECENT_ACTIVITY_FIXTURE } from "src/core/modules/blister-os/fixtures/recent-activity.fixture";
import { useBlisterOsStore } from "src/core/modules/blister-os/stores/blister-os-store";
import { DashboardStatCard } from "src/core/modules/dashboard/components/dashboard-stat-card";
import { MarketplaceStyleThumb } from "src/core/shared/components/blister/marketplace-style-thumb";
import { Button } from "src/core/shared/components/ui/button";
import { Card, CardContent } from "src/core/shared/components/ui/card";
import { Heading } from "src/core/shared/components/ui/heading";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

export const BlisterOsHomePage = () => {
  const t = useTranslations("home");
  const credits = useBlisterOsStore((state) => state.credits);
  const owned = useBlisterOsStore((state) => state.owned);
  const settings = useBlisterOsStore((state) => state.settings);

  const news = MARKETPLACE_ITEMS.filter((item) => item.flag).slice(0, 4);
  const videoEditor = AGENTS_CATALOG.find((agent) => agent.id === "video_editor");
  const cuts = AGENTS_CATALOG.find((agent) => agent.id === "cuts");
  const research = AGENTS_CATALOG.find((agent) => agent.id === "research");

  return (
    <div data-testid="dashboard-home-page">
      <PageLayout
        icon={LayoutDashboard}
        title={t("greeting", { name: settings.displayName })}
        description={t("subtitle")}
        actions={
          <Button asChild>
            <Link href={getAgentNewPath("video-editor")}>
              <Clapperboard className="size-4" />
              {t("primaryAction")}
            </Link>
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard
            label={t("stats.credits")}
            value={String(credits)}
            hint={t("stats.creditsHint")}
            icon={Coins}
          />
          <DashboardStatCard
            label={t("stats.library")}
            value={String(Object.keys(owned).length)}
            hint={t("stats.libraryHint")}
            icon={Store}
          />
          <DashboardStatCard
            label={t("stats.edits")}
            value="12"
            hint={videoEditor?.stat ?? ""}
            icon={Clapperboard}
            tone="success"
          />
          <DashboardStatCard
            label={t("stats.cuts")}
            value="38"
            hint={cuts?.stat ?? ""}
            icon={Scissors}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-[var(--line-default)] lg:col-span-2">
            <CardContent className="flex flex-col gap-4 p-6">
              <Heading level="h5" as="h2">
                {t("studioTitle")}
              </Heading>
              <div className="grid gap-4 sm:grid-cols-3">
                {[videoEditor, cuts, research].map((agent) =>
                  agent ? (
                    <Link
                      key={agent.id}
                      href={getAgentOverviewPath(agent.routeSlug)}
                      className="rounded-[var(--r-lg)] border border-[var(--line-default)] p-4 transition-colors hover:bg-[var(--bg-hover)]"
                    >
                      <agent.icon className="size-5 text-[var(--accent)]" />
                      <Heading level="h6" as="h3" className="mt-3">
                        {agent.name}
                      </Heading>
                      <Paragraph size="p5" tone="tertiary" className="mt-1 line-clamp-2">
                        {agent.description}
                      </Paragraph>
                    </Link>
                  ) : null,
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--line-default)]">
            <CardContent className="flex flex-col gap-4 p-6">
              <Heading level="h5" as="h2">
                {t("activityTitle")}
              </Heading>
              <ul className="flex flex-col gap-3">
                {RECENT_ACTIVITY_FIXTURE.map((entry) => (
                  <li key={entry.id}>
                    <Paragraph size="p5">{entry.text}</Paragraph>
                    <Paragraph size="p6" tone="quaternary">
                      {entry.when}
                    </Paragraph>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <Heading level="h5" as="h2">
              {t("marketplaceNews")}
            </Heading>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/marketplace">{t("seeAll")}</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {news.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/marketplace/${item.id}`}
                className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)]"
              >
                <MarketplaceStyleThumb item={item} />
                <div className="p-3">
                  <Paragraph className="font-medium">{item.name}</Paragraph>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </PageLayout>
    </div>
  );
};
