"use client";

import { cutsAgentSettingsSchema, type CutsAgentSettings } from "@company-os/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Scissors } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useCaptionStyles } from "src/core/modules/agents/hooks/use-caption-styles";
import {
  useCutsSettings,
  useUpdateCutsSettings,
} from "src/core/modules/agents/hooks/use-cuts-settings";
import { Button } from "src/core/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSwitchContent,
  FormSwitchItem,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import { Switch } from "src/core/shared/components/ui/switch";
import { SectionCard } from "src/core/shared/components/ui/section-card";

const cutsSettingsFormSchema = z.object({
  maxCuts: z.number().int().min(1).max(20),
  cutDurationSec: z.number().int().min(15).max(180),
  deleteSourceAfterRun: z.boolean(),
  addCaptions: z.boolean(),
  captionStyleId: z.string().optional(),
  autoAcceptResults: z.boolean(),
});

type CutsSettingsValues = z.infer<typeof cutsSettingsFormSchema>;

export const CutsSettings = () => {
  const t = useTranslations("agents.settings.cuts");
  const { data: settings, isLoading } = useCutsSettings();
  const { data: captionStyles = [] } = useCaptionStyles();
  const updateSettings = useUpdateCutsSettings();

  const form = useForm<CutsSettingsValues>({
    resolver: zodResolver(cutsSettingsFormSchema),
    mode: "onBlur",
    defaultValues: {
      maxCuts: 5,
      cutDurationSec: 60,
      deleteSourceAfterRun: false,
      addCaptions: false,
      autoAcceptResults: true,
    },
  });

  const hasHydratedSettings = useRef(false);

  useEffect(() => {
    if (!settings) return;

    // Hydrate once on load; skip refetches while the user is editing.
    if (!hasHydratedSettings.current) {
      form.reset(settings);
      hasHydratedSettings.current = true;
      return;
    }

    if (!form.formState.isDirty) {
      form.reset(settings);
    }
  }, [form, settings]);

  const addCaptions = useWatch({
    control: form.control,
    name: "addCaptions",
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    const parsed = cutsAgentSettingsSchema.parse(values);
    await updateSettings.mutateAsync(parsed);
    toast.success(t("saved"));
  });

  return (
    <SectionCard icon={Scissors} title={t("title")} description={t("description")}>
      <Form {...form}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="maxCuts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("maxCutsLabel")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(event) => field.onChange(event.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cutDurationSec"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("durationLabel")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(event) => field.onChange(event.target.valueAsNumber)}
                  />
                </FormControl>
                <FormDescription>{t("durationHint")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="autoAcceptResults"
            render={({ field }) => (
              <FormSwitchItem className="rounded-[var(--r-md)] border border-[var(--line-default)] p-4">
                <FormSwitchContent>
                  <FormLabel className="mt-0">{t("autoAcceptLabel")}</FormLabel>
                  <FormDescription className="mt-0">{t("autoAcceptHint")}</FormDescription>
                </FormSwitchContent>
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
            name="addCaptions"
            render={({ field }) => (
              <FormSwitchItem className="rounded-[var(--r-md)] border border-[var(--line-default)] p-4">
                <FormSwitchContent>
                  <FormLabel className="mt-0">{t("addCaptionsLabel")}</FormLabel>
                  <FormDescription className="mt-0">{t("addCaptionsHint")}</FormDescription>
                </FormSwitchContent>
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
          {addCaptions ? (
            <FormField
              control={form.control}
              name="captionStyleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("captionStyleLabel")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("captionStylePlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {captionStyles.map((style) => (
                        <SelectItem key={style.id} value={style.id}>
                          {style.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          <FormField
            control={form.control}
            name="deleteSourceAfterRun"
            render={({ field }) => (
              <FormSwitchItem className="rounded-[var(--r-md)] border border-[var(--line-default)] p-4">
                <FormSwitchContent>
                  <FormLabel className="mt-0">{t("deleteSourceLabel")}</FormLabel>
                  <FormDescription className="mt-0">{t("deleteSourceHint")}</FormDescription>
                </FormSwitchContent>
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
          <Button type="submit" className="w-fit" disabled={isLoading || updateSettings.isPending}>
            {t("save")}
          </Button>
        </form>
      </Form>
    </SectionCard>
  );
};
