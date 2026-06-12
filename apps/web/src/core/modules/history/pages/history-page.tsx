"use client";

import { History } from "lucide-react";
import { useTranslations } from "next-intl";

import { RECENT_ACTIVITY_FIXTURE } from "src/core/modules/blister-os/fixtures/recent-activity.fixture";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

export const BlisterHistoryPage = () => {
  const t = useTranslations("history");

  return (
    <div data-testid="history-page">
      <PageLayout icon={History} title={t("title")} description={t("description")}>
        <ul className="flex flex-col gap-3">
          {RECENT_ACTIVITY_FIXTURE.map((entry) => (
            <li
              key={entry.id}
              className="rounded-[var(--r-lg)] border border-[var(--line-default)] p-4"
            >
              <Paragraph className="font-medium">{entry.text}</Paragraph>
              <Paragraph size="p6" tone="quaternary">
                {entry.when}
              </Paragraph>
            </li>
          ))}
        </ul>
      </PageLayout>
    </div>
  );
};
