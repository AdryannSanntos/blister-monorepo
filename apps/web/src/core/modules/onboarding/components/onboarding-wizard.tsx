"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseAsInteger, useQueryState } from "nuqs";
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
import { useUserOrganizations } from "src/core/modules/organization/hooks/use-organizations";
import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { Form } from "src/core/shared/components/ui/form";
import { authClient } from "src/core/shared/utils/auth-client";
import { cn } from "src/core/shared/utils";
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

const STEP_DESCRIPTIONS = [
  "Conheça o Workana AI",
  "Nome, segmento e site",
  "Missão, visão e proposta",
  "Produtos e precificação",
  "Perfil do cliente ideal",
  "Como sua marca fala",
  "Diferenciais e FAQ",
  "Ferramentas e regras",
  "Confirme e publique",
];

const TOTAL_STEPS = STEP_KEYS.length;

// Steps where skip is allowed (not welcome, not review-publish)
const SKIPPABLE_STEP_KEYS: string[] = [
  "company-basics",
  "positioning",
  "products-services",
  "target-audience",
  "tone-of-voice",
  "differentials-faq",
  "processes-rules",
];

function getErrorMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(getErrorMessage).filter(Boolean).join(" ");
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (Array.isArray(record.message)) return getErrorMessage(record.message);
  }
  return "";
}

type OnboardingWizardProps = {
  /** 'page' = standalone full-screen, 'modal' = rendered inside a Dialog */
  mode?: "page" | "modal";
  /** Only used when mode='modal' */
  open?: boolean;
  onClose?: () => void;
};

function WizardContent({
  mode,
  onClose,
}: {
  mode: "page" | "modal";
  onClose?: () => void;
}) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { activeOrgId, isLoaded: isActiveOrgLoaded } = useActiveOrganization();
  const { data: organizations, isLoading: isOrgsLoading } = useUserOrganizations(session?.user?.id);
  const { data: draft, isLoading } = useOnboardingDraft(activeOrgId);
  const saveMutation = useSaveOnboardingDraft(activeOrgId);
  const publishMutation = usePublishOnboarding(activeOrgId);

  // Page mode tracks current step in URL; modal mode uses local state
  const [urlStep, setUrlStep] = useQueryState("step", parseAsInteger.withDefault(0));
  const [localStep, setLocalStep] = useState(0);
  const currentStep = mode === "page" ? urlStep : localStep;
  function setCurrentStep(step: number) {
    if (mode === "page") {
      void setUrlStep(step);
    } else {
      setLocalStep(step);
    }
  }
  const [initialized, setInitialized] = useState(false);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    mode: "onBlur",
    defaultValues: defaultOnboardingFormValues,
  });

  const activeOrg = organizations?.find((org) => org.id === activeOrgId);
  const isOwner = activeOrg?.roles?.some((r) => r.name === "owner") ?? false;

  // Page mode only: redirect if no active org
  useEffect(() => {
    if (mode === "page" && isActiveOrgLoaded && !activeOrgId) {
      router.replace("/app");
    }
  }, [activeOrgId, isActiveOrgLoaded, router, mode]);

  // Page mode only: redirect non-owners to dashboard
  useEffect(() => {
    if (mode === "page" && !isOrgsLoading && organizations && activeOrgId && !isOwner) {
      router.replace("/dashboard");
    }
  }, [isOrgsLoading, organizations, activeOrgId, isOwner, router, mode]);

  // Initialize step and form values once the draft query settles (with or without data)
  useEffect(() => {
    if (isLoading) return;
    if (initialized) return;
    if (draft) {
      setCurrentStep(draft.currentStep);
      form.reset(getOnboardingFormValues((draft.data as Record<string, unknown>) ?? {}));
    }
    setInitialized(true);
  }, [isLoading, draft, form, initialized]);

  // When published: page mode redirects, modal mode closes
  useEffect(() => {
    if (!initialized) return;
    if (!draft?.publishedAt) return;
    if (mode === "modal") {
      onClose?.();
    } else {
      router.replace("/dashboard");
    }
  }, [draft?.publishedAt, mode, onClose, router, initialized]);

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
    const stepKey = STEP_KEYS[currentStep];
    const stepFields = onboardingStepFields[stepKey as keyof typeof onboardingStepFields];
    if (stepFields) {
      const isValid = await form.trigger([...stepFields], { shouldFocus: true });
      if (!isValid) return;
    }
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    await save(nextStep);
  }

  async function handleSkip() {
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
      toast.success("Brain publicado com sucesso!");
      if (mode === "modal") {
        onClose?.();
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: unknown } } };
      const message = getErrorMessage(error?.response?.data?.message).toLowerCase();
      if (message.includes("owner")) {
        toast.error("Apenas o owner pode publicar o Brain.");
      } else if (message.includes("already")) {
        toast.error("O Brain já foi publicado.");
        if (mode === "modal") onClose?.();
        else router.push("/dashboard");
      } else {
        toast.error("Erro ao publicar. Tente novamente.");
      }
    }
  }

  const showLoading =
    mode === "modal"
      ? isLoading || !initialized
      : isLoading || isOrgsLoading || !initialized || !isActiveOrgLoaded || !activeOrgId;

  if (showLoading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOTAL_STEPS - 1;
  const stepKey = STEP_KEYS[currentStep];
  const canSkip = SKIPPABLE_STEP_KEYS.includes(stepKey);
  const reviewData = buildOnboardingDraftData(form.getValues());

  return (
    <div className={cn("flex", mode === "page" ? "min-h-screen bg-[var(--bg-canvas)]" : "h-full")}>
      {/* Sidebar */}
      <aside
        className={cn(
          "w-[240px] shrink-0 flex-col border-r border-[var(--line-subtle)] bg-[var(--bg-base)]",
          mode === "page" ? "hidden lg:flex" : "hidden sm:flex",
        )}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-[var(--line-subtle)] px-5">
          {mode === "modal" ? (
            <span className="text-[13px] font-medium text-[var(--fg-primary)]">Configurar Brain</span>
          ) : (
            <>
              <div className="flex size-6 items-center justify-center rounded-[var(--r-sm)] bg-primary text-primary-foreground text-[11px] font-semibold">
                W
              </div>
              <span className="text-[13px] font-medium text-[var(--fg-primary)]">Workana AI</span>
            </>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-3 px-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--fg-quaternary)]">
            Brain
          </p>
          <ul className="space-y-0.5">
            {STEP_KEYS.map((key, index) => {
              const isDone = index < currentStep;
              const isCurrent = index === currentStep;
              return (
                <li key={key}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-[var(--r-md)] px-3 py-2 text-[13px] transition-colors",
                      isCurrent && "bg-[var(--accent-soft)] text-[var(--accent)]",
                      !isCurrent && isDone && "text-[var(--fg-secondary)]",
                      !isCurrent && !isDone && "text-[var(--fg-quaternary)]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                        isCurrent && "border-[var(--accent)] bg-[var(--accent)] text-white",
                        isDone && !isCurrent && "border-[var(--success)] bg-[var(--success)] text-white",
                        !isCurrent && !isDone && "border-[var(--line-default)] text-[var(--fg-quaternary)]",
                      )}
                    >
                      {isDone ? <Check className="size-3" /> : index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className={cn("truncate text-[12px]", isCurrent && "font-medium")}>
                        {STEP_LABELS[index]}
                      </p>
                      <p className="truncate text-[10.5px] text-[var(--fg-quaternary)]">
                        {STEP_DESCRIPTIONS[index]}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-[var(--line-subtle)] px-5 py-4">
          <p className="text-[11px] text-[var(--fg-quaternary)]">
            Passo {currentStep + 1} de {TOTAL_STEPS}
          </p>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-sunken)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile progress bar */}
        <div className="flex items-center justify-between border-b border-[var(--line-subtle)] px-4 py-3 sm:hidden">
          <span className="text-[12px] text-[var(--fg-quaternary)]">
            Passo {currentStep + 1} de {TOTAL_STEPS} · {STEP_LABELS[currentStep]}
          </span>
          {mode === "modal" && (
            <button
              type="button"
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-[var(--r-sm)] text-[var(--fg-quaternary)] hover:bg-[var(--bg-hover)]"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-6 py-8 lg:px-10">
            <Form {...form}>
              {stepKey === "welcome" && <WelcomeStep />}
              {stepKey === "company-basics" && <CompanyBasicsStep form={form} />}
              {stepKey === "positioning" && <PositioningStep form={form} />}
              {stepKey === "products-services" && <ProductsServicesStep form={form} />}
              {stepKey === "target-audience" && <TargetAudienceStep form={form} />}
              {stepKey === "tone-of-voice" && <ToneOfVoiceStep form={form} />}
              {stepKey === "differentials-faq" && <DifferentialsFaqStep form={form} />}
              {stepKey === "processes-rules" && <ProcessesRulesStep form={form} />}
              {stepKey === "review-publish" && <ReviewPublishStep data={reviewData} />}
            </Form>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-[var(--line-subtle)] bg-[var(--bg-canvas)] px-6 py-4 lg:px-10">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <Button variant="outline" onClick={handleBack} disabled={isFirstStep}>
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              {canSkip && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={saveMutation.isPending}
                  className="text-[var(--fg-tertiary)]"
                >
                  Pular etapa
                </Button>
              )}
              {isLastStep ? (
                <Button onClick={handlePublish} disabled={publishMutation.isPending}>
                  {publishMutation.isPending ? "Publicando..." : "Publicar Brain"}
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Salvando..." : "Continuar"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OnboardingWizard({ mode = "page", open, onClose }: OnboardingWizardProps) {
  if (mode === "modal") {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] p-0 gap-0 overflow-hidden">
          <DialogTitle className="sr-only">Configurar Brain</DialogTitle>
          {/* key forces remount on each open so it always reads fresh cache */}
          {open && <WizardContent key={String(open)} mode="modal" onClose={onClose} />}
        </DialogContent>
      </Dialog>
    );
  }

  return <WizardContent mode="page" />;
}
