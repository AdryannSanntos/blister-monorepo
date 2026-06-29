"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useCompleteOnboarding } from "src/core/modules/company/hooks/use-company";
import { BrandLogo } from "src/core/shared/components/brand-logo";
import { Button } from "src/core/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { setActiveWorkspaceId } from "src/core/shared/utils/active-workspace";
import { z } from "zod";
import { useRouter } from "@/i18n/routing";

export type OnboardingFormValues = {
  companyName: string;
  description?: string;
};

export function OnboardingPage() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewCompany = searchParams.get("new") === "1";
  const { mutateAsync: completeOnboarding, isPending } =
    useCompleteOnboarding();

  const schema = useMemo(
    () =>
      z.object({
        companyName: z.string().min(2, t("validation.companyNameMin")),
        description: z.string().max(500).optional(),
      }),
    [t],
  );

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      companyName: "",
      description: "",
    },
  });

  const companyName = useWatch({
    control: form.control,
    name: "companyName",
  });

  async function handleSubmit(data: OnboardingFormValues) {
    try {
      const company = await completeOnboarding({
        companyName: data.companyName,
        ...(data.description ? { description: data.description } : {}),
        ...(isNewCompany ? { createNew: true } : {}),
      });
      toast.success(t("successMessage"));
      // Empresa recém-criada vira o workspace ativo e leva direto ao dashboard.
      setActiveWorkspaceId(company.id);
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error(t("saveError"));
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-canvas)] p-6">
      <div className="mb-8">
        <BrandLogo className="h-10 w-auto" />
      </div>

      <div className="w-full max-w-lg rounded-2xl border border-[var(--line-default)] bg-[var(--bg-base)] p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-[var(--fg-secondary)]">{t("subtitle")}</p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-6"
          >
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("companyNameLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("companyNamePlaceholder")}
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("objectiveLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("objectivePlaceholder")}
                      rows={3}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t("objectiveHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/dashboard")}
              >
                {t("skipButton")}
              </Button>
              <Button
                type="submit"
                disabled={isPending || !companyName}
              >
                {isPending ? t("submitting") : t("submitButton")}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
