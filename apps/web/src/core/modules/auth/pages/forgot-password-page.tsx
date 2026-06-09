"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Mail } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AuthBrandHeader } from "src/core/modules/auth/components/auth-brand-header";
import { AuthSplitLayout } from "src/core/modules/auth/components/auth-split-layout";
import { Button } from "src/core/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import { authClient } from "src/core/shared/utils/auth-client";
import { z } from "zod";

import { getPathname, Link } from "@/i18n/routing";

type ForgotPasswordFormValues = {
  email: string;
};

export function ForgotPasswordPage() {
  const locale = useLocale();
  const t = useTranslations("auth.forgotPassword");
  const tValidation = useTranslations("validation");
  const tCommon = useTranslations("common");
  const [isLoading, setIsLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const forgotPasswordSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(tValidation("invalidEmail")),
      }),
    [tValidation],
  );

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsLoading(true);
    try {
      const resetPath = getPathname({ locale, href: "/auth/reset-password" });
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}${resetPath}`
          : resetPath;

      const { error } = await authClient.forgetPassword({
        email: values.email,
        redirectTo,
      });

      if (error) {
        form.setError("email", {
          message: error.message ?? t("sendError"),
        });
        return;
      }

      setSentTo(values.email);
    } catch {
      form.setError("email", { message: tCommon("unexpectedError") });
    } finally {
      setIsLoading(false);
    }
  }

  if (sentTo) {
    return (
      <AuthSplitLayout>
        <AuthBrandHeader />

        <div className="flex size-12 items-center justify-center rounded-full bg-[var(--accent-soft)] mb-5">
          <Mail className="size-5 text-[var(--accent)]" />
        </div>

        <h1 className="text-[22px] font-semibold text-[var(--fg-primary)]">
          {t("sentTitle")}
        </h1>
        <p className="mt-1 mb-6 text-[13px] text-[var(--fg-tertiary)]">
          {t("sentSubtitle")}
        </p>

        <p className="text-[13px] text-[var(--fg-secondary)] mb-1">
          {t("sentBody", { email: sentTo })}
        </p>
        <p className="text-[12px] text-[var(--fg-tertiary)] mb-6">
          {t("spamHint")}
        </p>

        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--fg-tertiary)] underline-offset-4 hover:text-[var(--fg-secondary)] hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          {tCommon("backToLogin")}
        </Link>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout>
      <AuthBrandHeader />

      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[var(--fg-primary)]">
          {t("title")}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          {t("subtitle")}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tCommon("email")}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={tCommon("emailPlaceholder")}
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t("submitting") : t("submit")}
          </Button>
        </form>
      </Form>

      <div className="mt-6">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--fg-tertiary)] underline-offset-4 hover:text-[var(--fg-secondary)] hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          {tCommon("backToLogin")}
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
