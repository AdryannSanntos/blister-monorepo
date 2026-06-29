"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { GalleryHorizontal } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  carouselAgentSettingsSchema,
  carouselMetaRightModeSchema,
  carouselSocialNetworkSchema,
} from "@company-os/types";

import {
  useCarouselSettings,
  useUpdateCarouselSettings,
} from "src/core/modules/agents/hooks/use-carousel-settings";
import { useCarouselTemplates } from "src/core/modules/agents/hooks/use-carousel-templates";
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
import { Input } from "src/core/shared/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "src/core/shared/components/ui/input-group";
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

const carouselSettingsFormSchema = z.object({
  slidesCount: z.number().int().min(1).max(15),
  defaultTemplateId: z.string().optional(),
  defaultSocialNetworks: z.array(carouselSocialNetworkSchema),
  aiGeneratedImages: z.boolean(),
  brandName: z.string().optional(),
  instagramHandle: z.string().optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  metaRightMode: carouselMetaRightModeSchema,
});

type CarouselSettingsFormValues = z.infer<typeof carouselSettingsFormSchema>;

export const CarouselSettings = () => {
  const { data: settings } = useCarouselSettings();
  const updateSettings = useUpdateCarouselSettings();
  const { data: templates = [] } = useCarouselTemplates();

  const form = useForm<CarouselSettingsFormValues>({
    resolver: zodResolver(carouselSettingsFormSchema),
    mode: "onBlur",
    defaultValues: {
      slidesCount: 5,
      defaultSocialNetworks: ["instagram"],
      aiGeneratedImages: false,
      defaultTemplateId: templates[0]?.id,
      accentColor: "#FF4A0A",
      metaRightMode: "handle",
    },
  });

  const hasHydratedSettings = useRef(false);

  useEffect(() => {
    if (!settings) return;

    if (!hasHydratedSettings.current) {
      form.reset({
        ...settings,
        accentColor: settings.accentColor ?? "#FF4A0A",
        metaRightMode: settings.metaRightMode ?? "handle",
      });
      hasHydratedSettings.current = true;
      return;
    }

    if (!form.formState.isDirty) {
      form.reset({
        ...settings,
        accentColor: settings.accentColor ?? "#FF4A0A",
        metaRightMode: settings.metaRightMode ?? "handle",
      });
    }
  }, [form, settings]);

  const slidesCount = form.watch("slidesCount");

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const parsed = carouselAgentSettingsSchema.parse(values);
      await updateSettings.mutateAsync(parsed);
      toast.success("Configurações salvas");
    } catch {
      toast.error("Não foi possível salvar as configurações. Verifique os campos e tente novamente.");
    }
  });

  return (
    <SectionCard
      icon={GalleryHorizontal}
      title="Carrossel"
      description="Configurações padrão para a geração de carrosséis"
    >
      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="brandName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da marca</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Creator Lab" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription>Exibido no cabeçalho de cada slide</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instagramHandle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perfil @ da rede</FormLabel>
                  <FormControl>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <InputGroupText aria-hidden="true">@</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        placeholder="seuperfil"
                        aria-label="Perfil @ da rede"
                        {...field}
                        value={(field.value ?? "").replace(/^@/, "")}
                        onChange={(e) => field.onChange(e.target.value.replace(/^@/, ""))}
                      />
                    </InputGroup>
                  </FormControl>
                  <FormDescription>Usado no badge e no cabeçalho de cada slide</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="accentColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor principal</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        aria-label="Cor principal"
                        value={field.value}
                        onChange={field.onChange}
                        className="h-10 w-14 cursor-pointer rounded-[var(--r-sm)] border border-[var(--line-default)] bg-transparent"
                      />
                      <Input {...field} className="font-mono uppercase" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="metaRightMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cabeçalho direito</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="handle">Perfil @ da rede</SelectItem>
                      <SelectItem value="date">Data atual</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="slidesCount"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Quantidade padrão de slides</FormLabel>
                  <span className="text-sm font-semibold">{slidesCount}</span>
                </div>
                <Slider
                  min={1}
                  max={15}
                  step={1}
                  value={[field.value]}
                  onValueChange={(values) => {
                    const next = values[0];
                    if (next !== undefined) field.onChange(next);
                  }}
                  aria-label="Quantidade padrão de slides"
                  className="py-2"
                />
                <FormDescription>Entre 1 e 15 slides por carrossel</FormDescription>
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
                {templates.length === 0 ? (
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
                      {templates.map((tpl) => (
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

          <FormField
            control={form.control}
            name="aiGeneratedImages"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imagens geradas por IA</FormLabel>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Imagens geradas por IA"
                  />
                  {field.value ? (
                    <Badge variant="secondary">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Desativado</Badge>
                  )}
                </div>
                <FormDescription>
                  Preenche slots obrigatórios sem upload com imagens geradas automaticamente.
                </FormDescription>
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Salvando..." : "Salvar configurações"}
            </Button>
          </div>
        </form>
      </Form>
    </SectionCard>
  );
};
