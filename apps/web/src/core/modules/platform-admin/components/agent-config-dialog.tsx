"use client";

import {
  type AiModel,
  type PlatformAgentAdminItem,
  type PlatformAgentStep,
} from "@company-os/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSwitchItem,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import { Switch } from "src/core/shared/components/ui/switch";
import { z } from "zod";

import {
  useAiModels,
  useAiProviders,
  useUpdateAgentPolicy,
  useUpdateAgentStepPoliciesBatch,
  useUpdatePipeline,
} from "../hooks/use-ai-catalog";
import {
  filterImageModels,
  filterSpeechModels,
  filterTextModels,
} from "../utils/ai-model-filters";
import { AgentModelSelect } from "./agent-model-select";

const SPEECH_STEP_KEYS = new Set(["resolve_source"]);

const isStepModelConfigurable = (step: PlatformAgentStep): boolean => {
  if (step.type === "llm_call" || step.type === "image_generation") return true;
  if (step.type === "preparation" && SPEECH_STEP_KEYS.has(step.key)) return true;
  return false;
};

const filterModelsForStep = (step: PlatformAgentStep, models: AiModel[]): AiModel[] => {
  switch (step.type) {
    case "llm_call":
      return filterTextModels(models);
    case "image_generation":
      return filterImageModels(models);
    case "preparation":
      if (SPEECH_STEP_KEYS.has(step.key)) {
        return filterSpeechModels(models);
      }
      return [];
    default:
      return [];
  }
};

const schema = z.object({
  modelId: z.string().min(1),
  markupMultiplier: z.coerce.number().positive(),
  minCostPerRun: z.union([z.coerce.number().positive(), z.literal("")]).optional(),
  policyEnabled: z.boolean(),
  pipelineEnabled: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
  stepModels: z.record(z.string(), z.string()),
});

type AgentConfigFormInput = z.input<typeof schema>;
type AgentConfigFormOutput = z.output<typeof schema>;

type AgentConfigDialogProps = {
  agent: PlatformAgentAdminItem | null;
  allAgents: PlatformAgentAdminItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function filterModelsForAgent(
  agent: PlatformAgentAdminItem,
  models: AiModel[],
): AiModel[] {
  const enabledModels = models.filter((model) => model.isEnabled);
  const needsImage = agent.capabilities.includes("image_generation");
  const needsText =
    agent.capabilities.includes("text_generation") ||
    agent.capabilities.includes("strategy") ||
    agent.capabilities.includes("planning") ||
    agent.capabilities.includes("analysis");

  return enabledModels.filter((model) => {
    const caps = model.capabilities ?? [];
    if (needsImage && caps.includes("image")) return true;
    if (needsText && (caps.includes("text") || caps.includes("structured_output")))
      return true;
    return !needsImage && !needsText;
  });
}

export function AgentConfigDialog({
  agent,
  allAgents,
  open,
  onOpenChange,
}: AgentConfigDialogProps) {
  const t = useTranslations("platformAdmin.agentsTab");
  const { data: models = [] } = useAiModels();
  const { data: providers = [] } = useAiProviders();
  const { mutateAsync: updatePolicy, isPending: isSavingPolicy } =
    useUpdateAgentPolicy(agent?.agentId ?? "");
  const { mutateAsync: updateStepPolicies, isPending: isSavingStepPolicies } =
    useUpdateAgentStepPoliciesBatch(agent?.agentId ?? "");
  const { mutateAsync: updatePipeline, isPending: isSavingPipeline } =
    useUpdatePipeline();

  const form = useForm<AgentConfigFormInput, unknown, AgentConfigFormOutput>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      modelId: "",
      markupMultiplier: 1.2,
      minCostPerRun: "",
      policyEnabled: true,
      pipelineEnabled: true,
      sortOrder: 0,
      stepModels: {},
    },
  });

  const compatibleModels = useMemo(
    () => (agent ? filterModelsForAgent(agent, models) : []),
    [agent, models],
  );

  const configurableSteps = useMemo(
    () => (agent ? agent.steps.filter(isStepModelConfigurable) : []),
    [agent],
  );

  const openedForAgentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!agent || !open) {
      if (!open) openedForAgentIdRef.current = null;
      return;
    }

    const isNewAgentSession = openedForAgentIdRef.current !== agent.id;
    if (!isNewAgentSession && form.formState.isDirty) return;

    const stepModels: Record<string, string> = {};
    for (const step of agent.steps) {
      if (!isStepModelConfigurable(step)) continue;
      stepModels[step.key] = step.modelId ?? "__default__";
    }

    form.reset({
      modelId: agent.policy?.modelId ?? compatibleModels[0]?.id ?? "",
      markupMultiplier: agent.policy
        ? parseFloat(agent.policy.markupMultiplier)
        : 1.2,
      minCostPerRun: agent.policy?.minCostPerRun
        ? parseFloat(agent.policy.minCostPerRun)
        : "",
      policyEnabled: agent.policy?.isEnabled ?? true,
      pipelineEnabled: agent.isEnabled,
      sortOrder: agent.sortOrder,
      stepModels,
    });
    openedForAgentIdRef.current = agent.id;
  }, [agent, compatibleModels, form, open]);

  const handleSubmit = async (data: AgentConfigFormOutput) => {
    if (!agent) return;

    try {
      await updatePolicy({
        modelId: data.modelId,
        markupMultiplier: data.markupMultiplier,
        minCostPerRun:
          data.minCostPerRun === "" || data.minCostPerRun == null
            ? null
            : data.minCostPerRun,
        isEnabled: data.policyEnabled,
      });

      const changedSteps = configurableSteps
        .map((step) => {
          const selected = data.stepModels[step.key] ?? "__default__";
          return {
            stepKey: step.key,
            modelId: selected === "__default__" ? null : selected,
          };
        })
        .filter((step) => {
          const previousModelId = agent.steps.find((item) => item.key === step.stepKey)?.modelId ?? null;
          return step.modelId !== previousModelId;
        });

      if (changedSteps.length > 0) {
        await updateStepPolicies({ steps: changedSteps });
      }

      await updatePipeline({
        agents: allAgents.map((item) => ({
          agentId: item.agentId,
          sortOrder: item.agentId === agent.agentId ? data.sortOrder : item.sortOrder,
          isEnabled:
            item.agentId === agent.agentId ? data.pipelineEnabled : item.isEnabled,
        })),
      });

      toast.success(t("saveSuccess"));
      onOpenChange(false);
    } catch {
      toast.error(t("saveError"));
    }
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="animate-in fade-in zoom-in-95 flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle", { label: agent.label })}</DialogTitle>
          <DialogDescription>
            {agent.description ?? t("dialogDescriptionFallback")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {agent.capabilities.map((capability) => (
              <Badge key={capability} variant="secondary">
                {capability}
              </Badge>
            ))}
          </div>

          {agent.estimatedCreditCost != null ? (
            <p className="text-sm text-[var(--fg-secondary)]">
              {t("estimatedCost", {
                amount: agent.estimatedCreditCost.toFixed(2),
              })}
            </p>
          ) : null}
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1"
          >
            <FormField
              control={form.control}
              name="modelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("modelLabel")}</FormLabel>
                  <FormControl>
                    <AgentModelSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      models={compatibleModels}
                      providers={providers}
                      placeholder={t("modelPlaceholder")}
                      searchPlaceholder={t("modelSearchPlaceholder")}
                      emptyLabel={t("modelSearchEmpty")}
                      aria-invalid={Boolean(form.formState.errors.modelId)}
                    />
                  </FormControl>
                  <p className="text-xs text-[var(--fg-tertiary)]">
                    {t("agentDefaultModelHint")}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {configurableSteps.length > 0 ? (
              <div className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                  {t("stepModelsTitle")}
                </p>
                <p className="mb-4 text-xs text-[var(--fg-tertiary)]">
                  {t("stepModelsDescription")}
                </p>
                <ol className="flex flex-col gap-4">
                  {configurableSteps.map((step, index) => {
                    const stepModels = filterModelsForStep(step, models);

                    return (
                      <li key={step.key} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium">
                            {index + 1}. {step.label}
                          </span>
                          <Badge variant="outline">{step.type}</Badge>
                        </div>
                        <FormField
                          control={form.control}
                          name={`stepModels.${step.key}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <AgentModelSelect
                                  value={field.value ?? "__default__"}
                                  onValueChange={field.onChange}
                                  models={stepModels}
                                  providers={providers}
                                  placeholder={t("stepModelPlaceholder")}
                                  searchPlaceholder={t("modelSearchPlaceholder")}
                                  emptyLabel={t("modelSearchEmpty")}
                                  allowDefaultOption
                                  defaultOptionLabel={t("stepModelDefaultOption")}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="markupMultiplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("markupLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value as number}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minCostPerRun"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("minCostLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        {...field}
                        value={field.value as number | ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("sortOrderLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value as number}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-3">
              <FormField
                control={form.control}
                name="policyEnabled"
                render={({ field }) => (
                  <FormSwitchItem className="gap-3">
                    <FormLabel className="mt-0 flex-1">{t("policyEnabledLabel")}</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="shrink-0"
                      />
                    </FormControl>
                  </FormSwitchItem>
                )}
              />

              <FormField
                control={form.control}
                name="pipelineEnabled"
                render={({ field }) => (
                  <FormSwitchItem className="gap-3">
                    <FormLabel className="mt-0 flex-1">
                      {t("pipelineEnabledLabel")}
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="shrink-0"
                      />
                    </FormControl>
                  </FormSwitchItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("cancelButton")}
              </Button>
              <Button
                type="submit"
                disabled={
                  isSavingPolicy || isSavingStepPolicies || isSavingPipeline
                }
              >
                {isSavingPolicy || isSavingStepPolicies || isSavingPipeline
                  ? t("saving")
                  : t("saveButton")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
