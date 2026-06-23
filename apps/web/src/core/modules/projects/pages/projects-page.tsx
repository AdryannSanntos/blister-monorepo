"use client";

import { FolderKanban, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { PROJECTS_FIXTURE } from "src/core/modules/blister-os/fixtures/projects.fixture";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { SectionCard } from "src/core/shared/components/ui/section-card";

const formatUpdatedAt = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));

export function ProjectsPage() {
  const t = useTranslations("projects");
  const locale = useLocale();

  return (
    <div data-testid="projects-page">
      <PageLayout
        icon={FolderKanban}
        title={t("title")}
        description={t("description")}
        actions={
          <Button type="button" disabled>
            <Plus className="size-4" aria-hidden />
            {t("newProject")}
          </Button>
        }
      >
        <SectionCard icon={FolderKanban} title={t("listTitle")}>
          <div className="flex flex-col gap-3">
            {PROJECTS_FIXTURE.map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-4 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-elevated)] px-4 py-3"
              >
                <div className="flex size-9 items-center justify-center rounded-[var(--r-sm)] border border-[var(--line-default)] bg-[var(--bg-sunken)] text-[var(--fg-secondary)]">
                  <FolderKanban className="size-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-[var(--fg-primary)]">
                    {project.name}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">
                    {t("meta", {
                      count: project.piecesCount,
                      updatedAt: formatUpdatedAt(project.updatedAt, locale),
                    })}
                  </p>
                </div>
                <Badge variant={project.status === "in_progress" ? "default" : "secondary"}>
                  {project.status === "in_progress"
                    ? t("status.inProgress")
                    : t("status.draft")}
                </Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      </PageLayout>
    </div>
  );
}
