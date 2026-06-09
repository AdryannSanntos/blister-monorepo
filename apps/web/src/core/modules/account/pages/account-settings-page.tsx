"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  useChangePassword,
  useUpdateProfile,
} from "src/core/modules/account/hooks/use-account";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
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
import { Avatar, AvatarFallback } from "src/core/shared/components/ui/avatar";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import { LocaleFlagIcon } from "src/core/shared/components/flags/locale-flag-icon";
import { authClient } from "src/core/shared/utils/auth-client";

import { usePathname, useRouter, type AppLocale } from "@/i18n/routing";

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

type ProfileFormValues = {
  name: string;
};

function ProfileCard() {
  const { data: session } = authClient.useSession();
  const updateProfile = useUpdateProfile();
  const t = useTranslations("account.profile");
  const tValidation = useTranslations("validation");
  const tCommon = useTranslations("common");

  const profileSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, tValidation("nameMin")).max(120),
      }),
    [tValidation],
  );

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    defaultValues: { name: session?.user?.name ?? "" },
  });

  useEffect(() => {
    if (session?.user?.name) {
      form.reset({ name: session.user.name });
    }
  }, [session?.user?.name, form]);

  const user = session?.user;
  const initials = getInitials(user?.name, user?.email ?? "");

  async function onSubmit(values: ProfileFormValues) {
    await updateProfile.mutateAsync({ name: values.name });
  }

  return (
    <Card className="border-[var(--line-default)] bg-[var(--bg-base)]">
      <CardHeader className="p-6">
        <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <div className="mb-6 flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="text-[14px]">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[14px] font-medium text-[var(--fg-primary)]">
              {user?.name ?? "—"}
            </p>
            <p className="text-[13px] text-[var(--fg-tertiary)]">
              {user?.email}
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fullName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[var(--fg-secondary)]">
                {tCommon("email")}
              </p>
              <p className="text-[13px] text-[var(--fg-tertiary)]">
                {user?.email}
              </p>
              <p className="mt-1 text-[12px] text-[var(--fg-quaternary)]">
                {t("emailReadonly")}
              </p>
            </div>
            <Button
              type="submit"
              disabled={updateProfile.isPending || !form.formState.isDirty}
            >
              {updateProfile.isPending ? t("saving") : t("save")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const localeOptions: { value: AppLocale; labelKey: "ptBR" | "en" }[] = [
  { value: "pt-BR", labelKey: "ptBR" },
  { value: "en", labelKey: "en" },
];

function LanguageCard() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("account.language");

  const handleLocaleChange = (nextLocale: string) => {
    router.replace(pathname, { locale: nextLocale as AppLocale });
  };

  return (
    <Card className="border-[var(--line-default)] bg-[var(--bg-base)]">
      <CardHeader className="p-6">
        <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
          {t("title")}
        </CardTitle>
        <CardDescription className="text-[13px] text-[var(--fg-tertiary)]">
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <div className="space-y-2">
          <label
            htmlFor="language-select"
            className="text-[13px] font-medium text-[var(--fg-secondary)]"
          >
            {t("label")}
          </label>
          <Select value={locale} onValueChange={handleLocaleChange}>
            <SelectTrigger id="language-select" className="w-full max-w-xs">
              <SelectValue>
                <LocaleFlagIcon locale={locale} className="size-4 rounded-[2px]" />
                {t(localeOptions.find((o) => o.value === locale)?.labelKey ?? "ptBR")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {localeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <LocaleFlagIcon
                    locale={option.value}
                    className="size-4 rounded-[2px]"
                  />
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const changePassword = useChangePassword();
  const t = useTranslations("account.password");
  const tValidation = useTranslations("validation");

  const passwordSchema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1, tValidation("currentPasswordRequired")),
          newPassword: z.string().min(8, tValidation("newPasswordMin8")),
          confirmPassword: z.string().min(1, tValidation("confirmPasswordRequired")),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: tValidation("passwordMismatch"),
          path: ["confirmPassword"],
        }),
    [tValidation],
  );

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    mode: "onBlur",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: PasswordFormValues) {
    await changePassword.mutateAsync({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    form.reset();
  }

  return (
    <Card className="border-[var(--line-default)] bg-[var(--bg-base)]">
      <CardHeader className="p-6">
        <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("current")}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("new")}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("confirm")}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? t("submitting") : t("submit")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function AccountSettingsPage() {
  const t = useTranslations("account");

  return (
    <PageLayout icon={User} title={t("title")} description={t("description")}>
      <ProfileCard />
      <LanguageCard />
      <PasswordCard />
    </PageLayout>
  );
}
