"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  buildOnboardingDraftData,
  defaultOnboardingFormValues,
  getOnboardingFormValues,
  type OnboardingFormValues,
  onboardingFormSchema,
  onboardingStepFields,
} from "src/core/modules/onboarding/components/onboarding-form-schema";
import {
  useOnboardingDraft,
  usePublishOnboarding,
  useSaveOnboardingDraft,
} from "src/core/modules/onboarding/hooks/use-onboarding";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "src/core/shared/components/ui/card";
import { Form } from "src/core/shared/components/ui/form";
import { Progress } from "src/core/shared/components/ui/progress";
import { authClient } from "src/core/shared/utils/auth-client";
import { CompanyBasicsStep } from "./steps/company-basics-step";
import { DifferentialsFaqStep } from "./steps/differentials-faq-step";
import { PositioningStep } from "./steps/positioning-step";
import { ProcessesRulesStep } from "./steps/processes-rules-step";
import { ProductsServicesStep } from "./steps/products-services-step";
import { ReviewPublishStep } from "./steps/review-publish-step";
import { TargetAudienceStep } from "./steps/target-audience-step";
import { ToneOfVoiceStep } from "./steps/tone-of-voice-step";
import { WelcomeStep } from "./steps/welcome-step";

const STEP_KEYS = [
  "welcome",
  "company-basics",
  "positioning",
  "products-services",
  "target-audience",
  "tone-of-voice",
  "differentials-faq",
  "processes-rules",
  "review-publish",
] as const;

const STEP_LABELS = [
  "Boas-vindas",
  "Dados básicos",
  "Posicionamento",
  "Produtos",
  "Público-alvo",
  "Tom de voz",
  "Diferenciais",
  "Processos",
  "Revisão",
];

const TOTAL_STEPS = STEP_KEYS.length;

export function OnboardingWizard() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { activeOrgId } = useActiveOrganization();
  const { data: draft, isLoading } = useOnboardingDraft(activeOrgId);
  const saveMutation = useSaveOnboardingDraft(activeOrgId);
  const publishMutation = usePublishOnboarding(activeOrgId);

  const [currentStep, setCurrentStep] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    mode: "onBlur",
    defaultValues: defaultOnboardingFormValues,
  });

  useEffect(() => {
    if (draft && !initialized) {
      setCurrentStep(draft.currentStep);
      form.reset(
        getOnboardingFormValues((draft.data as Record<string, unknown>) ?? {}),
      );
      setInitialized(true);
    }
  }, [draft, form, initialized]);

  async function save(step: number) {
    try {
      await saveMutation.mutateAsync({
        currentStep: step,
        data: buildOnboardingDraftData(form.getValues()),
      });
    } catch {
      toast.error("Erro ao salvar progresso.");
    }
  }

  async function handleNext() {
    const stepFields =
      onboardingStepFields[
        STEP_KEYS[currentStep] as keyof typeof onboardingStepFields
      ];
    if (stepFields) {
      const isValid = await form.trigger([...stepFields], {
        shouldFocus: true,
      });
      if (!isValid) {
        return;
      }
    }

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    await save(nextStep);
  }

  async function handleBack() {
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    await save(prevStep);
  }

  async function handlePublish() {
    if (!session?.user?.id) return;

    try {
      await save(currentStep);
      await publishMutation.mutateAsync(session.user.id);
      toast.success("Company Brain publicado com sucesso!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const message = error?.response?.data?.message ?? "";

      if (message.toLowerCase().includes("owner")) {
        toast.error("Apenas o owner pode publicar o onboarding.");
      } else if (message.toLowerCase().includes("already")) {
        toast.error("O onboarding já foi publicado.");
        router.push("/dashboard");
      } else {
        toast.error("Erro ao publicar. Tente novamente.");
      }
    }
  }

  if (isLoading || !initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOTAL_STEPS - 1;
  const progress = ((currentStep + 1) / TOTAL_STEPS) * 100;
  const stepKey = STEP_KEYS[currentStep];
  const reviewData = buildOnboardingDraftData(form.getValues());

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between text-sm text-[var(--fg-tertiary)]">
            <span>{STEP_LABELS[currentStep]}</span>
            <span>
              {currentStep + 1} de {TOTAL_STEPS}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>

        <Form {...form}>
          <CardContent>
            {stepKey === "welcome" && <WelcomeStep />}
            {stepKey === "company-basics" && <CompanyBasicsStep form={form} />}
            {stepKey === "positioning" && <PositioningStep form={form} />}
            {stepKey === "products-services" && (
              <ProductsServicesStep form={form} />
            )}
            {stepKey === "target-audience" && (
              <TargetAudienceStep form={form} />
            )}
            {stepKey === "tone-of-voice" && <ToneOfVoiceStep form={form} />}
            {stepKey === "differentials-faq" && (
              <DifferentialsFaqStep form={form} />
            )}
            {stepKey === "processes-rules" && (
              <ProcessesRulesStep form={form} />
            )}
            {stepKey === "review-publish" && (
              <ReviewPublishStep data={reviewData} />
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isFirstStep}
            >
              Voltar
            </Button>

            {isLastStep ? (
              <Button
                onClick={handlePublish}
                disabled={publishMutation.isPending}
              >
                {publishMutation.isPending
                  ? "Publicando..."
                  : "Publicar Company Brain"}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Próximo"}
              </Button>
            )}
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
