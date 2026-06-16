"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
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
import { PasswordInput } from "src/core/shared/components/ui/password-input";
import { PasswordStrength } from "src/core/shared/components/ui/password-strength";
import { authClient } from "src/core/shared/utils/auth-client";
import { z } from "zod";

import { Link, useRouter } from "@/i18n/routing";

type ResetPasswordFormValues = {
  newPassword: string;
  confirmPassword: string;
};

export function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("auth.resetPassword");
  const tValidation = useTranslations("validation");
  const tCommon = useTranslations("common");

  const resetPasswordSchema = useMemo(
    () =>
      z
        .object({
          newPassword: z
            .string()
            .min(8, tValidation("passwordMin8"))
            .regex(/[A-Z]/, tValidation("passwordUppercase"))
            .regex(/[0-9]/, tValidation("passwordNumber"))
            .regex(/[^A-Za-z0-9]/, tValidation("passwordSpecial")),
          confirmPassword: z.string(),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: tValidation("passwordMismatch"),
          path: ["confirmPassword"],
        }),
    [tValidation],
  );

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const passwordValue = useWatch({
    control: form.control,
    name: "newPassword",
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) {
      toast.error(t("invalidToken"));
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: values.newPassword,
        token,
      });

      if (error) {
        toast.error(error.message ?? t("error"));
        return;
      }

      toast.success(t("success"));
      router.push("/auth/login");
    } catch {
      toast.error(tCommon("unexpectedError"));
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthSplitLayout>
        <AuthBrandHeader />

        <div className="mb-8">
          <h1 className="text-[22px] font-semibold text-[var(--fg-primary)]">
            {t("invalidLinkTitle")}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
            {t("invalidLinkSubtitle")}
          </p>
        </div>

        <p className="text-[13px] text-[var(--fg-secondary)] mb-6">
          {t("invalidLinkBody")}
        </p>

        <Button asChild className="w-full">
          <Link href="/auth/forgot-password">{t("requestNewLink")}</Link>
        </Button>
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
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("newPassword")}</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder={t("newPasswordPlaceholder")}
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                <PasswordStrength password={passwordValue} />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("confirmNewPassword")}</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder={t("confirmNewPasswordPlaceholder")}
                    autoComplete="new-password"
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
