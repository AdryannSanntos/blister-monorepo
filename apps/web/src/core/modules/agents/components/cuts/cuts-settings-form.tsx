"use client";

import { cutsAgentSettingsSchema, type CutsAgentSettings } from "@company-os/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Scissors } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { TextStylePicker } from "src/core/modules/marketplace/components/text-style-picker";
import { PositionPicker } from "./position-picker";

const overlayPointSchema = z.object({ x: z.number(), y: z.number() });

const cutsSettingsFormSchema = z.object({
  maxCuts: z.number().int().min(1).max(20),
  cutDurationSec: z.number().int().min(15).max(180),
  deleteSourceAfterRun: z.boolean(),
  addCaptions: z.boolean(),
  captionStyleId: z.string().optional(),
  captionPosition: overlayPointSchema,
  addTitle: z.boolean(),
  titleStyleId: z.string().optional(),
  titleDurationSec: z.number().min(1).max(10),
  titlePosition: overlayPointSchema,
  autoAcceptResults: z.boolean(),
  modelTier: z.enum(["auto", "basic", "pro"]),
})
  .refine((data) => !data.addCaptions || Boolean(data.captionStyleId), {
    message: "captionStyleRequired",
    path: ["captionStyleId"],
  })
  .refine((data) => !data.addTitle || Boolean(data.titleStyleId), {
    message: "titleStyleRequired",
    path: ["titleStyleId"],
  });

type CutsSettingsValues = z.infer<typeof cutsSettingsFormSchema>;

const MARKETPLACE_HREF = "/dashboard/marketplace";

export const CutsSettings = () => {
  const t = useTranslations("agents.settings.cuts");
  const { data: settings, isLoading } = useCutsSettings();
  const updateSettings = useUpdateCutsSettings();

  const form = useForm<CutsSettingsValues>({
    resolver: zodResolver(cutsSettingsFormSchema),
    mode: "onBlur",
    defaultValues: {
      maxCuts: 5,
      cutDurationSec: 60,
      deleteSourceAfterRun: false,
      addCaptions: false,
      captionPosition: { x: 0.5, y: 0.85 },
      addTitle: false,
      titleDurationSec: 5,
      titlePosition: { x: 0.5, y: 0.08 },
      autoAcceptResults: true,
      modelTier: "basic",
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

  const addCaptions = useWatch({ control: form.control, name: "addCaptions" });
  const addTitle = useWatch({ control: form.control, name: "addTitle" });
  const captionStyleId = useWatch({ control: form.control, name: "captionStyleId" });
  const titleStyleId = useWatch({ control: form.control, name: "titleStyleId" });
  const captionPosition = useWatch({ control: form.control, name: "captionPosition" });
  const titlePosition = useWatch({ control: form.control, name: "titlePosition" });

  const showPositioning = Boolean(addTitle) || Boolean(addCaptions);

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
            name="modelTier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("modelTierLabel")}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    if (value === "basic") field.onChange(value);
                  }}
                >
                  <FormControl>
                    <SelectTrigger data-testid="cuts-settings-model-tier">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="basic">{t("modelTierBasic")}</SelectItem>
                    <SelectItem value="auto" disabled>
                      {t("modelTierAuto")} ({t("modelTierComingSoon")})
                    </SelectItem>
                    <SelectItem value="pro" disabled>
                      {t("modelTierPro")} ({t("modelTierComingSoon")})
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>{t("modelTierHint")}</FormDescription>
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
                <FormItem className="rounded-[var(--r-md)] border border-[var(--line-default)] p-4">
                  <FormLabel>{t("captionStyleLabel")}</FormLabel>
                  <TextStylePicker
                    value={field.value}
                    onChange={(id) =>
                      form.setValue("captionStyleId", id, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    marketplaceHref={MARKETPLACE_HREF}
                    labels={{
                      empty: t("stylePickerEmpty"),
                      browse: t("stylePickerBrowse"),
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          <FormField
            control={form.control}
            name="addTitle"
            render={({ field }) => (
              <FormSwitchItem className="rounded-[var(--r-md)] border border-[var(--line-default)] p-4">
                <FormSwitchContent>
                  <FormLabel className="mt-0">{t("addTitleLabel")}</FormLabel>
                  <FormDescription className="mt-0">{t("addTitleHint")}</FormDescription>
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

          {addTitle ? (
            <div className="flex flex-col gap-4 rounded-[var(--r-md)] border border-[var(--line-default)] p-4">
              <FormField
                control={form.control}
                name="titleDurationSec"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("titleDurationLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormDescription>{t("titleDurationHint")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="titleStyleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("titleStyleLabel")}</FormLabel>
                    <TextStylePicker
                      value={field.value}
                      onChange={(id) =>
                        form.setValue("titleStyleId", id, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      marketplaceHref={MARKETPLACE_HREF}
                      labels={{
                        empty: t("stylePickerEmpty"),
                        browse: t("stylePickerBrowse"),
                      }}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ) : null}

          {showPositioning ? (
            <FormItem className="rounded-[var(--r-md)] border border-[var(--line-default)] p-4">
              <FormLabel>{t("positioningLabel")}</FormLabel>
              <FormDescription>{t("positioningHint")}</FormDescription>
              <PositionPicker
                showTitle={Boolean(addTitle)}
                showCaption={Boolean(addCaptions)}
                titlePosition={titlePosition ?? { x: 0.5, y: 0.08 }}
                captionPosition={captionPosition ?? { x: 0.5, y: 0.85 }}
                onTitleChange={(point) =>
                  form.setValue("titlePosition", point, { shouldDirty: true })
                }
                onCaptionChange={(point) =>
                  form.setValue("captionPosition", point, { shouldDirty: true })
                }
                labels={{
                  title: t("titleHandle"),
                  caption: t("captionHandle"),
                  hint: t("positioningDragHint"),
                }}
              />
            </FormItem>
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
