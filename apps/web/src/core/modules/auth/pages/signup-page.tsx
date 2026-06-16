"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { AuthBrandHeader } from "src/core/modules/auth/components/auth-brand-header";
import { AuthSplitLayout } from "src/core/modules/auth/components/auth-split-layout";
import { buildEmailVerificationCallbackURL } from "src/core/modules/auth/utils/verify-email-state";
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
import { PasswordInput } from "src/core/shared/components/ui/password-input";
import { PasswordStrength } from "src/core/shared/components/ui/password-strength";
import { authClient } from "src/core/shared/utils/auth-client";
import { z } from "zod";

import { getPathname, Link, useRouter } from "@/i18n/routing";

type SignupFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export function SignupPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("auth.signup");
  const tValidation = useTranslations("validation");
  const tCommon = useTranslations("common");

  const verifyEmailPath = getPathname({
    locale,
    href: "/auth/verify-email?status=success",
  });

  const loginCallbackURL =
    typeof window !== "undefined"
      ? buildEmailVerificationCallbackURL(
          window.location.origin,
          redirectPath,
          verifyEmailPath,
        )
      : `http://localhost:3000${verifyEmailPath}`;

  const signupSchema = useMemo(
    () =>
      z
        .object({
          name: z.string().min(2, tValidation("nameMin")),
          email: z.string().email(tValidation("invalidEmail")),
          password: z
            .string()
            .min(8, tValidation("passwordMin8"))
            .regex(/[A-Z]/, tValidation("passwordUppercase"))
            .regex(/[0-9]/, tValidation("passwordNumber"))
            .regex(/[^A-Za-z0-9]/, tValidation("passwordSpecial")),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: tValidation("passwordMismatch"),
          path: ["confirmPassword"],
        }),
    [tValidation],
  );

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const passwordValue = useWatch({
    control: form.control,
    name: "password",
  });

  async function onSubmit(values: SignupFormValues) {
    setIsLoading(true);
    try {
      const { error } = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
        callbackURL: loginCallbackURL,
      });

      if (error) {
        toast.error(error.message ?? t("createError"));
        return;
      }

      toast.success(t("createSuccess"));
      const verifyUrl = new URL(
        getPathname({ locale, href: "/auth/verify-email" }),
        window.location.origin,
      );
      verifyUrl.searchParams.set("email", values.email);
      if (redirectPath) verifyUrl.searchParams.set("redirect", redirectPath);
      router.push(`${verifyUrl.pathname}${verifyUrl.search}`);
    } catch {
      toast.error(tCommon("unexpectedError"));
    } finally {
      setIsLoading(false);
    }
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fullName")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("fullNamePlaceholder")}
                    autoComplete="name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tCommon("password")}</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder={t("passwordPlaceholder")}
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
                <FormLabel>{t("confirmPassword")}</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder={t("confirmPasswordPlaceholder")}
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

      <p className="mt-6 text-center text-[13px] text-[var(--fg-tertiary)]">
        {t("hasAccount")}{" "}
        <Link
          href="/auth/login"
          className="text-[var(--fg-primary)] underline-offset-4 hover:underline font-medium"
        >
          {t("signIn")}
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
