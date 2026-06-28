"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { GalleryHorizontal } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { carouselAgentSettingsSchema, carouselSocialNetworkSchema } from "@company-os/types";

// Local form schema without .default() to avoid zodResolver input/output type mismatch
const carouselSettingsFormSchema = z.object({
  slidesCount: z.number().int().min(3).max(15),
  defaultTemplateId: z.string().optional(),
  defaultSocialNetworks: z.array(carouselSocialNetworkSchema),
  aiGeneratedImages: z.boolean(),
});

type CarouselSettingsFormValues = z.infer<typeof carouselSettingsFormSchema>;
import { CAROUSEL_TEMPLATES_FIXTURE } from "src/core/modules/blister-os/fixtures/carousel-templates.fixture";
import {
  useCarouselSettings,
  useUpdateCarouselSettings,
} from "src/core/modules/agents/hooks/use-carousel-settings";
import { Badge } from "src/core/shared/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import { SectionCard } from "src/core/shared/components/ui/section-card";
import { Slider } from "src/core/shared/components/ui/slider";
import { Switch } from "src/core/shared/components/ui/switch";

export const CarouselSettings = () => {
  const { data: settings } = useCarouselSettings();
  const updateSettings = useUpdateCarouselSettings();

  const form = useForm<CarouselSettingsFormValues>({
    resolver: zodResolver(carouselSettingsFormSchema),
    mode: "onBlur",
    defaultValues: {
      slidesCount: 5,
      defaultSocialNetworks: ["instagram"],
      aiGeneratedImages: false,
      defaultTemplateId: CAROUSEL_TEMPLATES_FIXTURE[0]?.id,
    },
  });

  const hydrated = useRef(false);
  useEffect(() => {
    if (!settings || hydrated.current) return;
    form.reset(settings);
    hydrated.current = true;
  }, [settings, form]);

  const slidesCount = form.watch("slidesCount");

  const onSubmit = (values: CarouselSettingsFormValues) => {
    updateSettings.mutate(carouselAgentSettingsSchema.parse(values));
    toast.success("Configurações salvas");
  };

  return (
    <SectionCard
      icon={GalleryHorizontal}
      title="Carrossel"
      description="Configurações padrão para a geração de carrosséis"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <FormField
            control={form.control}
            name="slidesCount"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Quantidade padrão de slides</FormLabel>
                  <span className="text-sm font-semibold">{slidesCount}</span>
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
                <FormDescription>Entre 3 e 15 slides por carrossel</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="defaultTemplateId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Template padrão</FormLabel>
                {CAROUSEL_TEMPLATES_FIXTURE.length === 0 ? (
                  <p className="text-sm text-[var(--fg-tertiary)]">
                    Sem templates resgatados.{" "}
                    <a href="/dashboard/marketplace" className="text-[var(--accent)] underline">
                      Ver Marketplace
                    </a>
                  </p>
                ) : (
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CAROUSEL_TEMPLATES_FIXTURE.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.name}
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
            <FormLabel>Imagens geradas por IA</FormLabel>
            <div className="flex items-center gap-3">
              <Switch disabled checked={false} />
              <Badge variant="secondary">Em breve</Badge>
            </div>
            <FormDescription>
              A IA gerará automaticamente as imagens dos slides.
            </FormDescription>
          </FormItem>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? "Salvando..." : "Salvar configurações"}
            </Button>
          </div>
        </form>
      </Form>
    </SectionCard>
  );
};
