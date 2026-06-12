"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "src/core/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSwitchItem,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import { Switch } from "src/core/shared/components/ui/switch";
import { z } from "zod";

import { useAiModels, useAiProviders } from "../hooks/use-ai-catalog";
import {
  usePlatformSettings,
  useUpdateRagSettings,
} from "../hooks/use-platform-settings";
import {
  filterEmbeddingModels,
  filterTextModels,
} from "../utils/ai-model-filters";
import { AgentModelSelect } from "./agent-model-select";

const schema = z.object({
  embeddingModelId: z.string(),
  captionModelId: z.string(),
  chunkSize: z.coerce.number().int().positive(),
  chunkOverlap: z.coerce.number().int().min(0),
  topK: z.coerce.number().int().positive(),
  rerankEnabled: z.boolean(),
});

type RagSettingsFormInput = z.input<typeof schema>;
type RagSettingsFormOutput = z.output<typeof schema>;

export function RagSettingsTab() {
  const t = useTranslations("platformAdmin.ragTab");
  const tAgents = useTranslations("platformAdmin.agentsTab");
  const { data: settings, isLoading } = usePlatformSettings();
  const { data: models = [] } = useAiModels();
  const { data: providers = [] } = useAiProviders();
  const { mutateAsync: update, isPending } = useUpdateRagSettings();

  const embeddingModels = useMemo(
    () => filterEmbeddingModels(models),
    [models],
  );
  const captionModels = useMemo(() => filterTextModels(models), [models]);

  const form = useForm<RagSettingsFormInput, unknown, RagSettingsFormOutput>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      embeddingModelId: "",
      captionModelId: "",
      chunkSize: 512,
      chunkOverlap: 64,
      topK: 8,
      rerankEnabled: true,
    },
  });

  useEffect(() => {
    if (!settings?.rag) return;

    form.reset({
      embeddingModelId: settings.rag.embeddingModelId ?? "",
      captionModelId: settings.rag.captionModelId ?? "",
      chunkSize: settings.rag.chunkSize,
      chunkOverlap: settings.rag.chunkOverlap,
      topK: settings.rag.topK,
      rerankEnabled: settings.rag.rerankEnabled,
    });
  }, [settings?.rag, form]);

  const handleSubmit = async (data: RagSettingsFormOutput) => {
    try {
      await update({
        embeddingModelId: data.embeddingModelId || null,
        captionModelId: data.captionModelId || null,
        chunkSize: data.chunkSize,
        chunkOverlap: data.chunkOverlap,
        topK: data.topK,
        rerankEnabled: data.rerankEnabled,
      });
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveError"));
    }
  };

  if (isLoading) {
    return (
      <div className="h-32 animate-pulse rounded-lg bg-[var(--bg-sunken)]" />
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex max-w-xl flex-col gap-6"
      >
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-[var(--fg-primary)]">
              {t("systemAiTitle")}
            </h3>
            <p className="text-sm text-[var(--fg-secondary)]">
              {t("systemAiDescription")}
            </p>
          </div>

          <FormField
            control={form.control}
            name="embeddingModelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("embeddingModelLabel")}</FormLabel>
                <FormControl>
                  <AgentModelSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    models={embeddingModels}
                    providers={providers}
                    placeholder={t("embeddingModelPlaceholder")}
                    searchPlaceholder={tAgents("modelSearchPlaceholder")}
                    emptyLabel={tAgents("modelSearchEmpty")}
                    aria-invalid={Boolean(form.formState.errors.embeddingModelId)}
                  />
                </FormControl>
                <FormDescription>{t("embeddingModelDescription")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="captionModelId"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-3">
                  <FormLabel className="mt-0">{t("captionModelLabel")}</FormLabel>
                  {field.value ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-xs"
                      onClick={() => field.onChange("")}
                    >
                      {t("clearModelButton")}
                    </Button>
                  ) : null}
                </div>
                <FormControl>
                  <AgentModelSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    models={captionModels}
                    providers={providers}
                    placeholder={t("captionModelPlaceholder")}
                    searchPlaceholder={tAgents("modelSearchPlaceholder")}
                    emptyLabel={tAgents("modelSearchEmpty")}
                  />
                </FormControl>
                <FormDescription>{t("captionModelDescription")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section className="flex flex-col gap-4 border-t border-[var(--line-subtle)] pt-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-[var(--fg-primary)]">
              {t("retrievalTitle")}
            </h3>
            <p className="text-sm text-[var(--fg-secondary)]">
              {t("retrievalDescription")}
            </p>
          </div>

          <FormField
            control={form.control}
            name="chunkSize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("chunkSizeLabel")}</FormLabel>
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

          <FormField
            control={form.control}
            name="chunkOverlap"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("chunkOverlapLabel")}</FormLabel>
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

          <FormField
            control={form.control}
            name="topK"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("topKLabel")}</FormLabel>
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

          <FormField
            control={form.control}
            name="rerankEnabled"
            render={({ field }) => (
              <FormSwitchItem className="gap-3">
                <FormLabel className="mt-0 flex-1">{t("rerankEnabledLabel")}</FormLabel>
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
        </section>

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? t("saving") : t("submitButton")}
        </Button>
      </form>
    </Form>
  );
}
