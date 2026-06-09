"use client";

import { useTranslations } from "next-intl";

export function PlatformSupportPanel() {
  const t = useTranslations("platformAdmin.supportCard");

  return (
    <div className="rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-base)] p-6">
      <h2 className="text-lg font-semibold text-[var(--fg-primary)]">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm text-[var(--fg-tertiary)]">{t("description")}</p>
    </div>
  );
}
