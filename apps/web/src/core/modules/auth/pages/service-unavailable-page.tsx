"use client";

import { RotateCw, ServerCrash } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { AuthBrandHeader } from "src/core/modules/auth/components/auth-brand-header";
import { AuthSplitLayout } from "src/core/modules/auth/components/auth-split-layout";
import { Button } from "src/core/shared/components/ui/button";

import { Link } from "@/i18n/routing";

function getSafeRetryPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export function ServiceUnavailablePage() {
  const searchParams = useSearchParams();
  const retryPath = getSafeRetryPath(searchParams.get("next"));
  const t = useTranslations("auth.serviceUnavailable");

  return (
    <AuthSplitLayout>
      <AuthBrandHeader />

      <div className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-default)] bg-[var(--bg-subtle)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
          <span className="size-2 rounded-full bg-[var(--warning)]" />
          {t("badge")}
        </div>

        <div className="rounded-[var(--r-2xl)] border border-[var(--line-default)] bg-[var(--bg-base)] p-6 shadow-[var(--shadow-md)]">
          <div className="mb-5 flex size-14 items-center justify-center rounded-[var(--r-xl)] bg-[var(--bg-raised)] text-[var(--fg-secondary)]">
            <ServerCrash className="size-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-[22px] font-semibold text-[var(--fg-primary)]">
              {t("title")}
            </h1>
            <p className="text-[14px] leading-6 text-[var(--fg-tertiary)]">
              {t("description")}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="sm:flex-1">
              <Link href={retryPath}>
                <RotateCw className="size-4" />
                {t("retry")}
              </Link>
            </Button>

            <Button asChild variant="outline" className="sm:flex-1">
              <Link href="/auth/login">{t("goToLogin")}</Link>
            </Button>
          </div>

          <p className="mt-4 text-[12px] text-[var(--fg-quaternary)]">
            {t("footer")}
          </p>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
