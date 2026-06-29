"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import type { CarouselAgentSettings, CarouselSocialNetwork, CarouselRunInput } from "@company-os/types";
import { carouselRunInputSchema } from "@company-os/types";
import { CarouselSocialNetworkIcon } from "src/core/modules/agents/components/carousel/carousel-social-network-icon";
import { useCarouselTemplates } from "src/core/modules/agents/hooks/use-carousel-templates";
import { Button } from "src/core/shared/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "src/core/shared/components/ui/collapsible";
import { DialogFooter } from "src/core/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import { Input } from "src/core/shared/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "src/core/shared/components/ui/input-group";
import { Slider } from "src/core/shared/components/ui/slider";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { cn } from "src/core/shared/utils";

type CarouselSourceStepProps = {
  onSubmit: (data: CarouselRunInput) => void;
  defaultSlidesCount?: number;
  defaultTemplateId?: string;
  defaultBrandSettings?: CarouselAgentSettings;
  formId: string;
  isSubmitting?: boolean;
};

const SOCIAL_NETWORKS: Array<{ id: CarouselSocialNetwork; enabled: boolean }> = [
  { id: "instagram", enabled: true },
  { id: "facebook", enabled: false },
  { id: "tiktok", enabled: false },
];

export const CarouselSourceStep = ({
  onSubmit,
  defaultSlidesCount = 5,
  defaultTemplateId,
  defaultBrandSettings,
  formId,
  isSubmitting = false,
}: CarouselSourceStepProps) => {
  const t = useTranslations("carousel.modal");
  const tOptions = useTranslations("carousel.modal.options");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const { data: templates = [], isLoading: templatesLoading } = useCarouselTemplates();

  const form = useForm<CarouselRunInput>({
    resolver: zodResolver(carouselRunInputSchema),
    mode: "onBlur",
    defaultValues: {
      theme: "",
      templateId: defaultTemplateId ?? templates[0]?.id ?? "",
      socialNetworks: ["instagram"],
      slidesCount: defaultSlidesCount,
      brandOverrides: {
        brandName: defaultBrandSettings?.brandName,
        instagramHandle: defaultBrandSettings?.instagramHandle,
        accentColor: defaultBrandSettings?.accentColor ?? "#FF4A0A",
      },
    },
  });

  useEffect(() => {
    if (!defaultBrandSettings) return;
    form.setValue("brandOverrides", {
      brandName: defaultBrandSettings.brandName,
      instagramHandle: defaultBrandSettings.instagramHandle,
      accentColor: defaultBrandSettings.accentColor ?? "#FF4A0A",
    });
  }, [defaultBrandSettings, form]);

  useEffect(() => {
    if (defaultTemplateId) form.setValue("templateId", defaultTemplateId);
  }, [defaultTemplateId, form]);

  useEffect(() => {
    const current = form.getValues("templateId");
    if (!current && templates[0]?.id) {
      form.setValue("templateId", templates[0].id);
    }
  }, [templates, form]);

  const theme = form.watch("theme");
  const slidesCount = form.watch("slidesCount");
  const accentColor = form.watch("brandOverrides.accentColor") ?? "#FF4A0A";
  const hasTheme = theme.trim().length > 0;

  return (
    <>
      <Form {...form}>
        <form
          id={formId}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-w-0 flex-col gap-4"
          data-testid="carousel-source-step"
        >
          <FormField
            control={form.control}
            name="theme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("themeLabel")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("themePlaceholder")}
                    rows={3}
                    data-testid="carousel-theme-input"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Paragraph size="p6" tone="tertiary">
            {t("themeHint")}
          </Paragraph>

          <Collapsible open={optionsOpen} onOpenChange={setOptionsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="flex w-full items-center justify-between px-1"
                data-testid="carousel-options-trigger"
              >
                <span>{tOptions("title")}</span>
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    optionsOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-4 pt-2">
              <FormField
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tOptions("templateLabel")}</FormLabel>
                    {templatesLoading ? (
                      <Paragraph size="p5" tone="tertiary">
                        Carregando templates...
                      </Paragraph>
                    ) : templates.length === 0 ? (
                      <div className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] px-4 py-3">
                        <Paragraph size="p5" tone="secondary">
                          {tOptions("noTemplates")}{" "}
                          <a
                            href="/dashboard/marketplace"
                            className="text-[var(--accent)] underline"
                          >
                            {tOptions("browseTemplates")}
                          </a>
                        </Paragraph>
                      </div>
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="carousel-template-select">
                            <SelectValue placeholder={tOptions("templatePlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates.map((tpl) => (
                            <SelectItem key={tpl.id} value={tpl.id}>
                              <span className="flex items-center gap-2">
                                <span
                                  className="inline-block h-3 w-3 rounded-full"
                                  style={{ background: accentColor }}
                                />
                                {tpl.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>{tOptions("socialNetworkLabel")}</FormLabel>
                <div className="grid grid-cols-3 gap-2">
                  {SOCIAL_NETWORKS.map((net) => {
                    const isSelected = form
                      .watch("socialNetworks")
                      .includes(net.id);
                    return (
                      <button
                        key={net.id}
                        type="button"
                        disabled={!net.enabled}
                        aria-label={tOptions(`socialNetwork.${net.id}`)}
                        aria-pressed={isSelected && net.enabled}
                        onClick={() => {
                          if (!net.enabled) return;
                          form.setValue("socialNetworks", [net.id]);
                        }}
                        className={cn(
                          "flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-[var(--r-md)] border px-1.5 py-2.5 text-center transition-colors",
                          isSelected && net.enabled
                            ? "border-[var(--accent)] bg-[color-mix(in_oklch,var(--accent)_10%,transparent)] text-[var(--accent)]"
                            : "border-[var(--line-default)] text-[var(--fg-secondary)]",
                          !net.enabled && "cursor-not-allowed opacity-50",
                        )}
                      >
                        <CarouselSocialNetworkIcon
                          network={net.id}
                          className="size-4 shrink-0"
                        />
                        <span className="w-full truncate text-[11px] font-medium leading-none">
                          {tOptions(`socialNetwork.${net.id}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </FormItem>

              <FormField
                control={form.control}
                name="slidesCount"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>{tOptions("slidesCountLabel")}</FormLabel>
                      <span className="text-sm font-semibold text-[var(--fg-primary)]">
                        {slidesCount}
                      </span>
                    </div>
                    <Slider
                      min={3}
                      max={15}
                      step={1}
                      value={[field.value]}
                      onValueChange={(values) => {
                        const next = values[0];
                        if (next !== undefined) field.onChange(next);
                      }}
                      aria-label={tOptions("slidesCountLabel")}
                      data-testid="carousel-slides-slider"
                      className="py-2"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 border-t border-[var(--line-soft)] pt-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="brandOverrides.brandName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tOptions("brandNameLabel")}</FormLabel>
                      <FormControl>
                        <Input placeholder={tOptions("brandNamePlaceholder")} {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brandOverrides.instagramHandle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tOptions("socialHandleLabel")}</FormLabel>
                      <FormControl>
                        <InputGroup>
                          <InputGroupAddon align="inline-start">
                            <InputGroupText aria-hidden="true">@</InputGroupText>
                          </InputGroupAddon>
                          <InputGroupInput
                            placeholder={tOptions("socialHandlePlaceholder")}
                            aria-label={tOptions("socialHandleLabel")}
                            {...field}
                            value={(field.value ?? "").replace(/^@/, "")}
                            onChange={(e) => field.onChange(e.target.value.replace(/^@/, ""))}
                          />
                        </InputGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brandOverrides.accentColor"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>{tOptions("accentColorLabel")}</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            aria-label={tOptions("accentColorLabel")}
                            value={field.value ?? "#FF4A0A"}
                            onChange={field.onChange}
                            className="h-10 w-14 cursor-pointer rounded-[var(--r-sm)] border border-[var(--line-default)] bg-transparent"
                          />
                          <Input
                            value={field.value ?? "#FF4A0A"}
                            onChange={field.onChange}
                            className="font-mono uppercase"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </form>
      </Form>

      <DialogFooter>
        <Button
          type="submit"
          form={formId}
          disabled={!hasTheme || isSubmitting}
          data-testid="carousel-start-run-button"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              {t("starting")}
            </>
          ) : (
            t("start")
          )}
        </Button>
      </DialogFooter>
    </>
  );
};
