"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCompleteOnboarding } from "src/core/modules/company/hooks/use-company";
import { BrandLogo } from "src/core/shared/components/brand-logo";
import { setActiveCompanyId } from "src/core/shared/utils/active-company";
import { apiClient } from "src/core/shared/utils/api-client";
import { queryClient } from "src/core/shared/utils/query-client";
import { z } from "zod";
import { useRouter } from "@/i18n/routing";
import { StepBrandVoice } from "../components/step-brand-voice";
import { StepBusinessInfo } from "../components/step-business-info";

export type OnboardingFormValues = {
  companyName: string;
  niche: string;
  description: string;
  brandVoice: string;
  logoStorageKey?: string;
};

export function OnboardingPage() {
  const t = useTranslations("onboarding");
  const [step, setStep] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewCompany = searchParams.get("new") === "1";
  const { mutateAsync: completeOnboarding, isPending } =
    useCompleteOnboarding();

  const schema = useMemo(
    () =>
      z.object({
        companyName: z.string().min(2, t("validation.companyNameMin")),
        niche: z.string().min(2, t("validation.nicheMin")),
        description: z.string().min(10, t("validation.descriptionMin")),
        brandVoice: z.string().min(10, t("validation.brandVoiceMin")),
        logoStorageKey: z.string().optional(),
      }),
    [t],
  );

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      companyName: "",
      niche: "",
      description: "",
      brandVoice: "",
      logoStorageKey: undefined,
    },
  });

  async function handleSubmit(data: OnboardingFormValues) {
    try {
      const company = await completeOnboarding({
        ...data,
        ...(isNewCompany ? { createNew: true } : {}),
      });
      toast.success(t("successMessage"));

      const home = await queryClient.fetchQuery({
        queryKey: ["companies", "home-destination"],
        queryFn: async () => {
          const { data: destination } = await apiClient.get<{
            destination: "onboarding" | "dashboard" | "workspaces";
          }>("/companies/home-destination");
          return destination;
        },
      });

      if (home.destination === "workspaces") {
        router.push("/workspaces");
        return;
      }

      setActiveCompanyId(company.id);
      router.push("/dashboard");
    } catch {
      toast.error(t("saveError"));
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-canvas)] p-6">
      <div className="mb-8">
        <BrandLogo className="h-10 w-auto" />
      </div>

      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-8 shadow-sm">
        <div className="mb-6 flex gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-[var(--accent)]" : "bg-[var(--border)]"
              }`}
            />
          ))}
        </div>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            {step === 0 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-200">
                <StepBusinessInfo onNext={() => setStep(1)} />
              </div>
            )}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-200">
                <StepBrandVoice
                  onBack={() => setStep(0)}
                  submitting={isPending}
                />
              </div>
            )}
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
