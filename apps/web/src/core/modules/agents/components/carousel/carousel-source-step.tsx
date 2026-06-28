"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Share2, Globe } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { carouselRunInputSchema, type CarouselRunInput } from "@company-os/types";
import { CAROUSEL_TEMPLATES_FIXTURE } from "src/core/modules/blister-os/fixtures/carousel-templates.fixture";
import { Badge } from "src/core/shared/components/ui/badge";
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
import { Slider } from "src/core/shared/components/ui/slider";
import { Textarea } from "src/core/shared/components/ui/textarea";

type CarouselSourceStepProps = {
  onSubmit: (data: CarouselRunInput) => void;
  defaultSlidesCount?: number;
  defaultTemplateId?: string;
  formId: string;
};

const SOCIAL_NETWORKS = [
  { id: "instagram" as const, label: "Instagram", icon: Share2, enabled: true },
  { id: "facebook" as const, label: "Facebook", icon: Globe, enabled: false },
];

export const CarouselSourceStep = ({
  onSubmit,
  defaultSlidesCount = 5,
  defaultTemplateId,
  formId,
}: CarouselSourceStepProps) => {
  const form = useForm<CarouselRunInput>({
    resolver: zodResolver(carouselRunInputSchema),
    mode: "onBlur",
    defaultValues: {
      theme: "",
      templateId: defaultTemplateId ?? CAROUSEL_TEMPLATES_FIXTURE[0]?.id ?? "",
      socialNetworks: ["instagram"],
      slidesCount: defaultSlidesCount,
    },
  });

  useEffect(() => {
    if (defaultTemplateId) form.setValue("templateId", defaultTemplateId);
  }, [defaultTemplateId, form]);

  const slidesCount = form.watch("slidesCount");

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tema do carrossel</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ex: 5 hábitos para ser mais produtivo, como fazer um bolo de cenoura..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="templateId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template</FormLabel>
              {CAROUSEL_TEMPLATES_FIXTURE.length === 0 ? (
                <div className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] px-4 py-3">
                  <Paragraph size="p5" tone="secondary">
                    Nenhum template disponível.{" "}
                    <a href="/dashboard/marketplace" className="text-[var(--accent)] underline">
                      Ver templates no Marketplace
                    </a>
                  </Paragraph>
                </div>
              ) : (
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CAROUSEL_TEMPLATES_FIXTURE.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ background: tpl.thumbnailColor }}
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
          <FormLabel>Rede social</FormLabel>
          <div className="flex gap-3">
            {SOCIAL_NETWORKS.map((net) => {
              const Icon = net.icon;
              const isSelected = form.watch("socialNetworks").includes(net.id);
              return (
                <button
                  key={net.id}
                  type="button"
                  disabled={!net.enabled}
                  onClick={() => {
                    if (!net.enabled) return;
                    form.setValue("socialNetworks", [net.id]);
                  }}
                  className={[
                    "flex items-center gap-2 rounded-[var(--r-md)] border px-4 py-2.5 text-sm font-medium transition-colors",
                    isSelected && net.enabled
                      ? "border-[var(--accent)] bg-[color-mix(in_oklch,var(--accent)_10%,transparent)] text-[var(--accent)]"
                      : "border-[var(--line-default)] text-[var(--fg-secondary)]",
                    !net.enabled && "cursor-not-allowed opacity-50",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <Icon className="size-4" />
                  {net.label}
                  {!net.enabled && (
                    <Badge variant="secondary" className="ml-1 text-[10px]">
                      Em breve
                    </Badge>
                  )}
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
                <FormLabel>Quantidade de slides</FormLabel>
                <span className="text-sm font-semibold text-[var(--fg-primary)]">
                  {slidesCount}
                </span>
              </div>
              <FormControl>
                <Slider
                  min={3}
                  max={15}
                  step={1}
                  value={[field.value]}
                  onValueChange={([v]) => field.onChange(v)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
