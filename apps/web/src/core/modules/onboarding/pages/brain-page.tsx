"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Brain,
  Building2,
  Edit2,
  MessageSquare,
  Settings2,
  Target,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { type ComponentType, useState } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { type UseFormReturn, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  buildOnboardingDraftData,
  getOnboardingFormValues,
  type OnboardingFormValues,
  onboardingFormSchema,
  onboardingStepFields,
} from "src/core/modules/onboarding/components/onboarding-form-schema";
import { OnboardingWizard } from "src/core/modules/onboarding/components/onboarding-wizard";
import { CompanyBasicsStep } from "src/core/modules/onboarding/components/steps/company-basics-step";
import { DifferentialsFaqStep } from "src/core/modules/onboarding/components/steps/differentials-faq-step";
import { PositioningStep } from "src/core/modules/onboarding/components/steps/positioning-step";
import { ProcessesRulesStep } from "src/core/modules/onboarding/components/steps/processes-rules-step";
import { ProductsServicesStep } from "src/core/modules/onboarding/components/steps/products-services-step";
import { TargetAudienceStep } from "src/core/modules/onboarding/components/steps/target-audience-step";
import { ToneOfVoiceStep } from "src/core/modules/onboarding/components/steps/tone-of-voice-step";
import {
  useOnboardingDraft,
  useSaveOnboardingDraft,
} from "src/core/modules/onboarding/hooks/use-onboarding";
import { useAbility } from "src/core/modules/organization/hooks/use-ability";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { EmptyState } from "src/core/shared/components/ui/empty-state";
import { Form } from "src/core/shared/components/ui/form";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "src/core/shared/components/ui/tabs";

type SectionKey =
  | "company-basics"
  | "positioning"
  | "products-services"
  | "target-audience"
  | "tone-of-voice"
  | "differentials-faq"
  | "processes-rules";

type SectionConfig = {
  key: SectionKey;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  fields: readonly (keyof OnboardingFormValues)[];
  fieldLabels: Partial<Record<keyof OnboardingFormValues, string>>;
  Component: ComponentType<{ form: UseFormReturn<OnboardingFormValues> }>;
};

const SECTIONS: SectionConfig[] = [
  {
    key: "company-basics",
    label: "Dados básicos",
    description: "Nome, segmento e descrição da empresa",
    icon: Building2,
    fields: onboardingStepFields["company-basics"],
    fieldLabels: {
      companyName: "Nome",
      industry: "Segmento",
      description: "Descrição",
      website: "Website",
    },
    Component: CompanyBasicsStep,
  },
  {
    key: "positioning",
    label: "Posicionamento",
    description: "Missão, visão e proposta de valor",
    icon: TrendingUp,
    fields: onboardingStepFields.positioning,
    fieldLabels: {
      mission: "Missão",
      vision: "Visão",
      valueProposition: "Proposta de valor",
    },
    Component: PositioningStep,
  },
  {
    key: "products-services",
    label: "Produtos e serviços",
    description: "Ofertas e modelo de precificação",
    icon: BookOpen,
    fields: onboardingStepFields["products-services"],
    fieldLabels: {
      products: "Produtos",
      pricing: "Precificação",
    },
    Component: ProductsServicesStep,
  },
  {
    key: "target-audience",
    label: "Público-alvo",
    description: "Perfil do cliente ideal e canais",
    icon: Users,
    fields: onboardingStepFields["target-audience"],
    fieldLabels: {
      idealCustomer: "Cliente ideal",
      painPoints: "Dores",
      channels: "Canais",
    },
    Component: TargetAudienceStep,
  },
  {
    key: "tone-of-voice",
    label: "Tom de voz",
    description: "Como a marca se comunica",
    icon: MessageSquare,
    fields: onboardingStepFields["tone-of-voice"],
    fieldLabels: {
      tone: "Tom",
      communicationStyle: "Estilo",
      avoidWords: "Evitar",
    },
    Component: ToneOfVoiceStep,
  },
  {
    key: "differentials-faq",
    label: "Diferenciais e FAQ",
    description: "O que diferencia e dúvidas frequentes",
    icon: Target,
    fields: onboardingStepFields["differentials-faq"],
    fieldLabels: {
      differentials: "Diferenciais",
      faq: "FAQ",
    },
    Component: DifferentialsFaqStep,
  },
  {
    key: "processes-rules",
    label: "Processos e regras",
    description: "Fluxos, regras e ferramentas",
    icon: Wrench,
    fields: onboardingStepFields["processes-rules"],
    fieldLabels: {
      processes: "Processos",
      rules: "Regras",
      tools: "Ferramentas",
    },
    Component: ProcessesRulesStep,
  },
];

type SectionEditDialogProps = {
  section: SectionConfig;
  currentValues: OnboardingFormValues;
  onSave: (values: OnboardingFormValues) => Promise<void>;
  isPending: boolean;
  onClose: () => void;
};

function SectionEditDialog({
  section,
  currentValues,
  onSave,
  isPending,
  onClose,
}: SectionEditDialogProps) {
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    mode: "onBlur",
    defaultValues: currentValues,
  });

  async function handleSave() {
    const fields = [...section.fields] as Array<keyof OnboardingFormValues>;
    const isValid = await form.trigger(fields, { shouldFocus: true });
    if (!isValid) return;
    await onSave(form.getValues());
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar {section.label}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <div className="py-2">
            <section.Component form={form} />
          </div>
        </Form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SectionPanelProps = {
  section: SectionConfig;
  values: OnboardingFormValues;
  canEdit: boolean;
  onEdit: () => void;
};

function SectionPanel({ section, values, canEdit, onEdit }: SectionPanelProps) {
  const Icon = section.icon;

  return (
    <div className="flex flex-col gap-4 rounded-[var(--r-xl)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-raised)]">
            <Icon className="size-4 text-[var(--fg-tertiary)]" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-[var(--fg-primary)]">
              {section.label}
            </p>
            <p className="text-[11.5px] text-[var(--fg-quaternary)]">
              {section.description}
            </p>
          </div>
        </div>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Editar ${section.label}`}
            onClick={onEdit}
            className="shrink-0"
          >
            <Edit2 className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="grid gap-3 border-t border-[var(--line-subtle)] pt-4">
        {section.fields.map((field) => {
          const label = section.fieldLabels[field];
          const value = values[field];
          return (
            <div
              key={field}
              className="rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-sunken)]/60 px-3 py-2.5"
            >
              <p className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--fg-quaternary)]">
                {label}
              </p>
              <div className="text-[12.5px] leading-[1.55] text-[var(--fg-secondary)] whitespace-pre-wrap break-words">
                {value || (
                  <span className="italic text-[var(--fg-quaternary)]">
                    Nao preenchido
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BrainPage() {
  const { activeOrgId } = useActiveOrganization();
  const { can, isLoading: abilityLoading } = useAbility();
  const { data: draft, isLoading } = useOnboardingDraft(activeOrgId);
  const saveMutation = useSaveOnboardingDraft(activeOrgId);
  const queryClient = useQueryClient();
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const SECTION_KEYS = SECTIONS.map((s) => s.key) as [SectionKey, ...SectionKey[]];
  const [activeSection, setActiveSection] = useQueryState(
    "section",
    parseAsStringLiteral(SECTION_KEYS).withDefault(SECTIONS[0].key),
  );

  const canEdit = !abilityLoading && can("update", "CompanyBrain");
  const isPublished = Boolean(draft?.publishedAt);

  const currentValues = draft?.data
    ? getOnboardingFormValues(draft.data as Record<string, unknown>)
    : null;

  const editingConfig = editingSection
    ? (SECTIONS.find((s) => s.key === editingSection) ?? null)
    : null;

  async function handleSectionSave(values: OnboardingFormValues) {
    if (!draft) return;
    try {
      const updatedData = buildOnboardingDraftData(values);
      const merged = {
        ...(draft.data as Record<string, unknown>),
        ...updatedData,
      };
      await saveMutation.mutateAsync({
        currentStep: draft.currentStep,
        data: merged,
      });
      toast.success("Seção atualizada com sucesso.");
      setEditingSection(null);
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    }
  }

  if (isLoading || abilityLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <PageLayout
      eyebrow="Workspace"
      title="Brain"
      description="Contexto central da empresa usado por todos os agentes. Mantenha atualizado para maximizar a qualidade das execuções."
      actions={
        <div className="flex items-center gap-2">
          {isPublished ? (
            <Badge variant="secondary" className="text-[11px]">
              Publicado
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="text-[11px] text-[var(--warning)]"
            >
              Rascunho
            </Badge>
          )}
          {isPublished && canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWizardOpen(true)}
            >
              <Settings2 className="size-3.5" />
              Editar wizard
            </Button>
          )}
        </div>
      }
    >

      {/* Estado: não configurado */}
      {!isPublished && (
        <EmptyState
          icon={Brain}
          title="Brain não configurado"
          description="O Brain é o contexto que os agentes usam para gerar conteúdo alinhado com a sua empresa. Complete o wizard para publicá-lo."
          action={
            canEdit ? (
              <Button onClick={() => setWizardOpen(true)}>
                {draft ? "Continuar configuração" : "Configurar Brain"}
              </Button>
            ) : undefined
          }
          note={
            canEdit
              ? undefined
              : "Solicite ao owner ou admin que configure o Brain."
          }
        />
      )}

      {/* Estado: publicado */}
      {isPublished && currentValues && (
        <Tabs
          value={activeSection}
          onValueChange={(value) => void setActiveSection(value as SectionKey)}
          className="space-y-5"
        >
          <TabsList
            variant="underline"
            className="w-full justify-start overflow-x-auto"
          >
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <TabsTrigger
                  key={section.key}
                  value={section.key}
                  className="gap-2"
                >
                  <Icon className="size-4" />
                  {section.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {SECTIONS.map((section) => (
            <TabsContent key={section.key} value={section.key} className="mt-0">
              <SectionPanel
                section={section}
                values={currentValues}
                canEdit={canEdit}
                onEdit={() => setEditingSection(section.key)}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Dialog de edição de seção */}
      {editingConfig && currentValues && (
        <SectionEditDialog
          key={editingSection}
          section={editingConfig}
          currentValues={currentValues}
          onSave={handleSectionSave}
          isPending={saveMutation.isPending}
          onClose={() => setEditingSection(null)}
        />
      )}

      {/* Wizard modal */}
      <OnboardingWizard
        mode="modal"
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          queryClient.invalidateQueries({
            queryKey: ["onboarding", activeOrgId],
          });
        }}
      />
    </PageLayout>
  );
}
