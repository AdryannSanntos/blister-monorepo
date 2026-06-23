"use client";

import { updateRagSettingsSchema } from "@company-os/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
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
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import { Switch } from "src/core/shared/components/ui/switch";
import { z } from "zod";

import { useAiModels, useAiProviders } from "../hooks/use-ai-catalog";
import {
  useRagSettings,
  useUpdateRagSettings,
} from "../hooks/use-platform-rag-settings";
import {
  filterEmbeddingModels,
  filterTextModels,
} from "../utils/ai-model-filters";
import { AgentModelSelect } from "./agent-model-select";

const formSchema = updateRagSettingsSchema
  .required({
    embeddingModelId: true,
    chunkSize: true,
    chunkOverlap: true,
    topK: true,
    rerankEnabled: true,
  })
  .extend({
    embeddingModelId: z.string().min(1),
    captionModelId: z.string().min(1).nullable(),
    chunkSize: z.coerce.number().int().min(100).max(8000),
    chunkOverlap: z.coerce.number().int().min(0).max(500),
    topK: z.coerce.number().int().min(1).max(50),
  });

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

const DEFAULTS: FormOutput = {
  embeddingModelId: "",
  captionModelId: null,
  chunkSize: 512,
  chunkOverlap: 64,
  topK: 8,
  rerankEnabled: true,
};

export function SystemAiTab() {
  const t = useTranslations("platformAdmin.systemAiTab");
  const { data: rag, isLoading } = useRagSettings();
  const { mutateAsync: updateRag, isPending } = useUpdateRagSettings();
  const { data: models } = useAiModels();
  const { data: providers } = useAiProviders();

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: DEFAULTS,
  });

  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (!rag) return;
    if (hasHydratedRef.current && form.formState.isDirty) return;

    form.reset({
      embeddingModelId: rag.embeddingModelId ?? "",
      captionModelId: rag.captionModelId,
      chunkSize: rag.chunkSize,
      chunkOverlap: rag.chunkOverlap,
      topK: rag.topK,
      rerankEnabled: rag.rerankEnabled,
    });
    hasHydratedRef.current = true;
  }, [rag, form]);

  const allModels = models ?? [];
  const allProviders = providers ?? [];
  const embeddingModels = filterEmbeddingModels(allModels);
  const textModels = filterTextModels(allModels);

  const handleSubmit = async (data: FormOutput) => {
    try {
      await updateRag({
        embeddingModelId: data.embeddingModelId,
        captionModelId: data.captionModelId,
        chunkSize: data.chunkSize,
        chunkOverlap: data.chunkOverlap,
        topK: data.topK,
        rerankEnabled: data.rerankEnabled,
      });
      toast.success(t("saveSuccess"));
      form.reset(data);
    } catch {
      toast.error(t("saveError"));
    }
  };

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-[var(--bg-sunken)]" />;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex max-w-xl flex-col gap-6"
      >
        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-medium">{t("modelsTitle")}</h3>

          <FormField
            control={form.control}
            name="embeddingModelId"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{t("embeddingLabel")}</FormLabel>
                <FormControl>
                  <AgentModelSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    models={embeddingModels}
                    providers={allProviders}
                    placeholder={t("embeddingPlaceholder")}
                    searchPlaceholder={t("modelSearchPlaceholder")}
                    emptyLabel={t("noEmbeddingModels")}
                    aria-invalid={Boolean(fieldState.error)}
                  />
                </FormControl>
                <FormDescription>{t("embeddingHelp")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="captionModelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("captionLabel")}</FormLabel>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <FormControl>
                      <AgentModelSelect
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        models={textModels}
                        providers={allProviders}
                        placeholder={t("captionPlaceholder")}
                        searchPlaceholder={t("modelSearchPlaceholder")}
                        emptyLabel={t("noTextModels")}
                      />
                    </FormControl>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!field.value}
                    onClick={() => field.onChange(null)}
                  >
                    {t("clear")}
                  </Button>
                </div>
                <FormDescription>{t("captionHelp")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-medium">{t("indexingTitle")}</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          </div>

          <FormField
            control={form.control}
            name="rerankEnabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4 rounded-[var(--r-md)] border-[1.5px] border-[var(--line-default)] p-3">
                <div className="flex flex-col gap-0.5">
                  <FormLabel>{t("rerankLabel")}</FormLabel>
                  <FormDescription>{t("rerankHelp")}</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </section>

        <Button
          type="submit"
          disabled={isPending || !form.formState.isDirty}
          className="w-fit"
        >
          {isPending ? t("saving") : t("submitButton")}
        </Button>
      </form>
    </Form>
  );
}
