"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Link } from "@/i18n/routing";

interface AuthSplitLayoutProps {
  children: ReactNode;
}

export function AuthSplitLayout({ children }: AuthSplitLayoutProps) {
  const t = useTranslations("common");
  const year = new Date().getFullYear();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 hidden overflow-hidden lg:flex auth-visual-panel">
        <div className="absolute inset-0 auth-mesh-bg" />
        <div className="absolute top-1/4 left-1/4 size-[400px] rounded-full opacity-30 blur-3xl auth-orb-1" />
        <div className="absolute bottom-1/4 right-1/4 size-[300px] rounded-full opacity-25 blur-3xl auth-orb-2" />
        <div className="absolute top-3/4 left-1/2 size-[200px] rounded-full opacity-20 blur-2xl auth-orb-3" />

        <div className="absolute right-6 bottom-6 left-[calc(50%+1.5rem)] rounded-[var(--r-xl)] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
          <p className="text-center text-[11px] text-white/50 leading-relaxed">
            {t("copyright", { year })}{" "}
            <Link
              href="/privacy"
              className="underline-offset-2 hover:underline hover:text-white/70 transition-colors"
            >
              {t("privacyPolicy")}
            </Link>
            {" · "}
            <Link
              href="/terms"
              className="underline-offset-2 hover:underline hover:text-white/70 transition-colors"
            >
              {t("termsOfUse")}
            </Link>
          </p>
        </div>
      </div>

      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center bg-[var(--bg-canvas)] px-6 py-12 lg:w-1/2 lg:rounded-r-[var(--r-2xl)] lg:border-r lg:border-[var(--line-subtle)] lg:shadow-[var(--shadow-lg)]">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
