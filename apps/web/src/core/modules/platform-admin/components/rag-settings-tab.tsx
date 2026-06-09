"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { Switch } from "src/core/shared/components/ui/switch";
import { z } from "zod";

import {
  usePlatformSettings,
  useUpdateRagSettings,
} from "../hooks/use-platform-settings";

const schema = z.object({
  chunkSize: z.coerce.number().int().positive(),
  chunkOverlap: z.coerce.number().int().min(0),
  topK: z.coerce.number().int().positive(),
  rerankEnabled: z.boolean(),
});

type RagSettingsFormInput = z.input<typeof schema>;
type RagSettingsFormOutput = z.output<typeof schema>;

export function RagSettingsTab() {
  const t = useTranslations("platformAdmin.ragTab");
  const { data: settings, isLoading } = usePlatformSettings();
  const { mutateAsync: update, isPending } = useUpdateRagSettings();

  const form = useForm<RagSettingsFormInput, unknown, RagSettingsFormOutput>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      chunkSize: 512,
      chunkOverlap: 64,
      topK: 8,
      rerankEnabled: true,
    },
  });

  useEffect(() => {
    if (settings?.rag) {
      form.reset({
        chunkSize: settings.rag.chunkSize,
        chunkOverlap: settings.rag.chunkOverlap,
        topK: settings.rag.topK,
        rerankEnabled: settings.rag.rerankEnabled,
      });
    }
  }, [settings?.rag, form]);

  async function onSubmit(data: RagSettingsFormOutput) {
    try {
      await update(data);
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveError"));
    }
  }

  if (isLoading) {
    return (
      <div className="h-32 animate-pulse rounded-lg bg-[var(--bg-sunken)]" />
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex max-w-md flex-col gap-6"
      >
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
            <FormItem className="flex items-center gap-3">
              <FormLabel className="mt-0">{t("rerankEnabledLabel")}</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? t("saving") : t("submitButton")}
        </Button>
      </form>
    </Form>
  );
}
