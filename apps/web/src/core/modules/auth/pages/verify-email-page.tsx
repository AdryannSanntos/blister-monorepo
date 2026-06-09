"use client";

import { ArrowLeft, Mail, MailCheck, MailX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AuthBrandHeader } from "src/core/modules/auth/components/auth-brand-header";
import { AuthSplitLayout } from "src/core/modules/auth/components/auth-split-layout";
import {
  buildEmailVerificationCallbackURL,
  getVerifyEmailViewState,
} from "src/core/modules/auth/utils/verify-email-state";
import { Button } from "src/core/shared/components/ui/button";
import { authClient } from "src/core/shared/utils/auth-client";

import { getPathname, Link } from "@/i18n/routing";

export function VerifyEmailPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const state = getVerifyEmailViewState(new URLSearchParams(searchParams));
  const [isResending, setIsResending] = useState(false);
  const t = useTranslations("auth.verifyEmail");
  const tCommon = useTranslations("common");

  const verifySuccessPath = getPathname({
    locale,
    href: "/auth/verify-email?status=success",
  });

  const verificationCallbackURL =
    typeof window !== "undefined"
      ? buildEmailVerificationCallbackURL(
          window.location.origin,
          state.redirect,
          verifySuccessPath,
        )
      : `http://localhost:3000${verifySuccessPath}`;

  const loginHref = state.redirect
    ? `/auth/login?redirect=${encodeURIComponent(state.redirect)}`
    : "/auth/login";

  const title = t(`states.${state.kind}.title`);
  const description = t(`states.${state.kind}.description`);

  async function handleResend() {
    if (!state.email) {
      toast.error(t("emailNotFound"));
      return;
    }

    setIsResending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: state.email,
        callbackURL: verificationCallbackURL,
      });

      if (error) {
        toast.error(error.message ?? t("resendError"));
        return;
      }

      toast.success(t("resendSuccess", { email: state.email }));
    } catch {
      toast.error(tCommon("unexpectedError"));
    } finally {
      setIsResending(false);
    }
  }

  if (state.kind === "success") {
    return (
      <AuthSplitLayout>
        <AuthBrandHeader />

        <div className="flex size-12 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--success)_15%,transparent)] mb-5">
          <MailCheck className="size-5 text-[var(--success)]" />
        </div>

        <h1 className="text-[22px] font-semibold text-[var(--fg-primary)]">
          {title}
        </h1>
        <p className="mt-1 mb-6 text-[13px] text-[var(--fg-tertiary)]">
          {description}
        </p>

        <Button asChild className="w-full">
          <Link href={loginHref}>{tCommon("goToLogin")}</Link>
        </Button>
      </AuthSplitLayout>
    );
  }

  if (state.kind === "error") {
    return (
      <AuthSplitLayout>
        <AuthBrandHeader />

        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 mb-5">
          <MailX className="size-5 text-destructive" />
        </div>

        <h1 className="text-[22px] font-semibold text-[var(--fg-primary)]">
          {title}
        </h1>
        <p className="mt-1 mb-6 text-[13px] text-[var(--fg-tertiary)]">
          {description}
        </p>

        <Button asChild className="w-full">
          <Link href={loginHref}>{tCommon("goToLogin")}</Link>
        </Button>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout>
      <AuthBrandHeader />

      <div className="flex size-12 items-center justify-center rounded-full bg-[var(--accent-soft)] mb-5">
        <Mail className="size-5 text-[var(--accent)]" />
      </div>

      <h1 className="text-[22px] font-semibold text-[var(--fg-primary)]">
        {title}
      </h1>
      <p className="mt-1 mb-6 text-[13px] text-[var(--fg-tertiary)]">
        {description}
      </p>

      <p className="text-[13px] text-[var(--fg-secondary)] mb-1">
        {state.email
          ? t("pendingBody", { email: state.email })
          : t("pendingBodyFallback")}
      </p>
      <p className="text-[12px] text-[var(--fg-tertiary)] mb-6">
        {t("spamHint")}
      </p>

      <Button
        variant="outline"
        className="w-full mb-4"
        onClick={handleResend}
        disabled={isResending}
      >
        {isResending ? t("resending") : t("resend")}
      </Button>

      <Link
        href={loginHref}
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--fg-tertiary)] underline-offset-4 hover:text-[var(--fg-secondary)] hover:underline"
      >
        <ArrowLeft className="size-3.5" />
        {tCommon("backToLogin")}
      </Link>
    </AuthSplitLayout>
  );
}
