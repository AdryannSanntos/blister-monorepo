"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  brandPaletteSchema,
  calculateBrandBrainProgress,
  marketingObjectiveSchema,
  marketingObjectiveValues,
  normalizeBrandPalette,
  visualStyleValues,
  type BrandPalette,
  type BrandProfileResponse,
  type CompanyResponse,
} from "@company-os/types";
import {
  Building2,
  ImageIcon,
  MessageSquareText,
  Package,
  Palette,
  Share2,
  Target,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { BrandBrainProgressSummary } from "src/core/modules/brand/components/brand-brain-progress-summary";
import { BrandBrainTabTrigger } from "src/core/modules/brand/components/brand-brain-tab-trigger";
import { BrandAssetsGrid } from "src/core/modules/brand/components/brand-assets-grid";
import { BrandTabPanel } from "src/core/modules/brand/components/brand-tab-panel";
import { LogoVariantsUploader } from "src/core/modules/brand/components/logo-variants-uploader";
import { PaletteEditor } from "src/core/modules/brand/components/palette-editor";
import { SocialNetworkPicker } from "src/core/modules/brand/components/social-network-picker";
import { useUpdateBrand } from "src/core/modules/brand/hooks/use-brand";
import { useUpdateCompany } from "src/core/modules/company/hooks/use-company";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
} from "src/core/shared/components/ui/tabs";
import { Textarea } from "src/core/shared/components/ui/textarea";

const BRAND_TAB_VALUES = [
  "visual",
  "business",
  "audience",
  "voice",
  "social",
  "offer",
] as const;

type BrandTab = (typeof BRAND_TAB_VALUES)[number];

type BrandBrainFormProps = {
  company: CompanyResponse;
  brand: BrandProfileResponse;
};

const emptyToNull = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const withDefaultColorNames = (
  palette: BrandPalette,
  t: (key: string, values?: Record<string, string | number>) => string,
): BrandPalette => ({
  ...palette,
  primary: {
    ...palette.primary,
    name: palette.primary.name || t("visualSection.primaryDefaultName"),
  },
  secondary: {
    ...palette.secondary,
    name: palette.secondary.name || t("visualSection.secondaryDefaultName"),
  },
  additional: palette.additional.map((entry, index) => ({
    ...entry,
    name:
      entry.name ||
      t("visualSection.additionalDefaultName", { index: index + 1 }),
  })),
});

function TabSaveButton({
  isDirty,
  isPending,
  label,
  savingLabel,
}: {
  isDirty: boolean;
  isPending: boolean;
  label: string;
  savingLabel: string;
}) {
  return (
    <Button type="submit" disabled={!isDirty || isPending} className="w-fit">
      {isPending ? savingLabel : label}
    </Button>
  );
}

export function BrandBrainForm({ company, brand }: BrandBrainFormProps) {
  const t = useTranslations("brand");
  const tValidation = useTranslations("validation");
  const { mutateAsync: updateCompany, isPending: isUpdatingCompany } =
    useUpdateCompany();
  const { mutateAsync: updateBrand, isPending: isUpdatingBrand } =
    useUpdateBrand();

  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(BRAND_TAB_VALUES).withDefault("visual"),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("tab") === "logo") {
      void setTab("visual");
    }
  }, [setTab]);

  const businessSchema = useMemo(
    () =>
      z.object({
        companyName: z.string().min(2, tValidation("nameMin")).max(120),
        niche: z.string().min(2, t("validation.nicheMin")).max(200),
        description: z
          .string()
          .min(10, t("validation.descriptionMin"))
          .max(2000),
      }),
    [t, tValidation],
  );

  const audienceSchema = useMemo(
    () =>
      z.object({
        targetAudience: z.string().max(1000).optional(),
        marketingObjective: marketingObjectiveSchema.nullable(),
      }),
    [],
  );

  const voiceSchema = useMemo(
    () =>
      z.object({
        brandVoice: z
          .string()
          .min(10, t("validation.brandVoiceMin"))
          .max(2000),
      }),
    [t],
  );

  const socialSchema = useMemo(
    () =>
      z.object({
        socialNetworks: z.array(z.string()),
      }),
    [],
  );

  const visualSchema = useMemo(
    () =>
      z.object({
        palette: brandPaletteSchema.superRefine((palette, ctx) => {
          palette.additional.forEach((entry, index) => {
            if (!entry.name.trim()) {
              ctx.addIssue({
                code: "custom",
                message: t("validation.colorNameRequired"),
                path: ["additional", index, "name"],
              });
            }
          });
        }),
        visualStyle: z.string().nullable(),
        typography: z.string().max(200).nullable(),
      }),
    [t],
  );

  const offerSchema = useMemo(
    () =>
      z.object({
        mainProducts: z.string().max(2000).optional(),
        differentiators: z.string().max(2000).optional(),
      }),
    [],
  );

  const businessForm = useForm<z.infer<typeof businessSchema>>({
    resolver: zodResolver(businessSchema),
    mode: "onBlur",
    defaultValues: {
      companyName: company.name,
      niche: brand.niche ?? "",
      description: brand.description ?? "",
    },
  });

  const audienceForm = useForm<z.infer<typeof audienceSchema>>({
    resolver: zodResolver(audienceSchema),
    mode: "onBlur",
    defaultValues: {
      targetAudience: brand.targetAudience ?? "",
      marketingObjective: brand.marketingObjective,
    },
  });

  const voiceForm = useForm<z.infer<typeof voiceSchema>>({
    resolver: zodResolver(voiceSchema),
    mode: "onBlur",
    defaultValues: { brandVoice: brand.brandVoice },
  });

  const socialForm = useForm<z.infer<typeof socialSchema>>({
    resolver: zodResolver(socialSchema),
    mode: "onBlur",
    defaultValues: { socialNetworks: brand.socialNetworks ?? [] },
  });

  const visualForm = useForm<z.infer<typeof visualSchema>>({
    resolver: zodResolver(visualSchema),
    mode: "onBlur",
    defaultValues: {
      palette: withDefaultColorNames(normalizeBrandPalette(brand.palette), t),
      visualStyle: brand.visualStyle,
      typography: brand.typography,
    },
  });

  const offerForm = useForm<z.infer<typeof offerSchema>>({
    resolver: zodResolver(offerSchema),
    mode: "onBlur",
    defaultValues: {
      mainProducts: brand.mainProducts ?? "",
      differentiators: brand.differentiators ?? "",
    },
  });

  const hydratedKeyRef = useRef<string | null>(null);
  const hydrationKey = `${company.id}:${brand.updatedAt ?? "initial"}`;

  useEffect(() => {
    const isFirstHydration = hydratedKeyRef.current !== hydrationKey;
    const forms = [
      businessForm,
      audienceForm,
      voiceForm,
      socialForm,
      visualForm,
      offerForm,
    ];

    if (!isFirstHydration && forms.some((entry) => entry.formState.isDirty)) {
      return;
    }

    businessForm.reset({
      companyName: company.name,
      niche: brand.niche ?? "",
      description: brand.description ?? "",
    });
    audienceForm.reset({
      targetAudience: brand.targetAudience ?? "",
      marketingObjective: brand.marketingObjective,
    });
    voiceForm.reset({ brandVoice: brand.brandVoice });
    socialForm.reset({ socialNetworks: brand.socialNetworks ?? [] });
    visualForm.reset({
      palette: withDefaultColorNames(normalizeBrandPalette(brand.palette), t),
      visualStyle: brand.visualStyle,
      typography: brand.typography,
    });
    offerForm.reset({
      mainProducts: brand.mainProducts ?? "",
      differentiators: brand.differentiators ?? "",
    });

    hydratedKeyRef.current = hydrationKey;
  }, [
    hydrationKey,
    company.name,
    brand,
    businessForm,
    audienceForm,
    voiceForm,
    socialForm,
    visualForm,
    offerForm,
    t,
  ]);

  const tabItems: Array<{
    id: BrandTab;
    label: string;
    icon: typeof Building2;
  }> = [
    { id: "visual", label: t("tabs.visual"), icon: Palette },
    { id: "business", label: t("tabs.business"), icon: Building2 },
    { id: "audience", label: t("tabs.audience"), icon: Target },
    { id: "voice", label: t("tabs.voice"), icon: MessageSquareText },
    { id: "social", label: t("tabs.social"), icon: Share2 },
    { id: "offer", label: t("tabs.offer"), icon: Package },
  ];

  async function handleSaveBusiness(values: z.infer<typeof businessSchema>) {
    try {
      if (values.companyName !== company.name) {
        await updateCompany({ name: values.companyName });
      }
      await updateBrand({
        niche: emptyToNull(values.niche),
        description: emptyToNull(values.description),
      });
      toast.success(t("saveSuccess"));
      businessForm.reset(values);
    } catch {
      toast.error(t("saveError"));
    }
  }

  async function handleSaveAudience(values: z.infer<typeof audienceSchema>) {
    try {
      await updateBrand({
        targetAudience: emptyToNull(values.targetAudience),
        marketingObjective: values.marketingObjective,
      });
      toast.success(t("saveSuccess"));
      audienceForm.reset(values);
    } catch {
      toast.error(t("saveError"));
    }
  }

  async function handleSaveVoice(values: z.infer<typeof voiceSchema>) {
    try {
      await updateBrand({ brandVoice: values.brandVoice });
      toast.success(t("saveSuccess"));
      voiceForm.reset(values);
    } catch {
      toast.error(t("saveError"));
    }
  }

  async function handleSaveSocial(values: z.infer<typeof socialSchema>) {
    try {
      await updateBrand({ socialNetworks: values.socialNetworks });
      toast.success(t("saveSuccess"));
      socialForm.reset(values);
    } catch {
      toast.error(t("saveError"));
    }
  }

  async function handleSaveVisual(values: z.infer<typeof visualSchema>) {
    try {
      const palette: BrandPalette = {
        ...values.palette,
        primary: {
          ...values.palette.primary,
          name: t("visualSection.primaryDefaultName"),
          description: emptyToNull(
            values.palette.primary.description ?? undefined,
          ),
        },
        secondary: {
          ...values.palette.secondary,
          name: t("visualSection.secondaryDefaultName"),
          description: emptyToNull(
            values.palette.secondary.description ?? undefined,
          ),
        },
        additional: values.palette.additional.map((entry) => ({
          ...entry,
          name: entry.name.trim(),
          description: emptyToNull(entry.description ?? undefined),
        })),
      };

      await updateBrand({
        palette,
        visualStyle: emptyToNull(values.visualStyle),
        typography: emptyToNull(values.typography),
      });
      toast.success(t("saveSuccess"));
      visualForm.reset({ ...values, palette });
    } catch {
      toast.error(t("saveError"));
    }
  }

  async function handleSaveOffer(values: z.infer<typeof offerSchema>) {
    try {
      await updateBrand({
        mainProducts: emptyToNull(values.mainProducts),
        differentiators: emptyToNull(values.differentiators),
      });
      toast.success(t("saveSuccess"));
      offerForm.reset(values);
    } catch {
      toast.error(t("saveError"));
    }
  }

  const isSavingBusiness = isUpdatingCompany || isUpdatingBrand;
  const isSavingBrand = isUpdatingBrand;

  const progress = useMemo(
    () =>
      calculateBrandBrainProgress({
        companyName: company.name,
        logoStorageKey: brand.logoStorageKey,
        logoVariants: brand.logoVariants,
        brandVoice: brand.brandVoice,
        niche: brand.niche,
        description: brand.description,
        targetAudience: brand.targetAudience,
        marketingObjective: brand.marketingObjective,
        socialNetworks: brand.socialNetworks ?? [],
        palette: brand.palette,
        visualStyle: brand.visualStyle,
        typography: brand.typography,
        mainProducts: brand.mainProducts,
        differentiators: brand.differentiators,
      }),
    [brand, company.name],
  );

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as BrandTab)}
      className="flex flex-col gap-6"
    >
      <BrandBrainProgressSummary progress={progress} />

      <TabsList variant="pill" className="flex-wrap justify-start">
        {tabItems.map((item) => (
          <BrandBrainTabTrigger
            key={item.id}
            value={item.id}
            label={item.label}
            icon={item.icon}
            percent={progress.sections[item.id].percent}
            brainComplete={progress.overall.percent >= 100}
          />
        ))}
      </TabsList>

      <TabsContent value="visual" className="animate-in fade-in duration-200">
        <div className="flex flex-col gap-6">
          <BrandTabPanel
            icon={ImageIcon}
            title={t("logoSection.title")}
            description={t("logoSection.description")}
          >
            <div className="flex flex-col gap-4">
              <LogoVariantsUploader logoVariants={brand.logoVariants ?? {}} />
              <p className="text-[13px] text-[var(--fg-tertiary)]">
                {t("logoSection.autoSaveHint")}
              </p>
            </div>
          </BrandTabPanel>

          <Form {...visualForm}>
            <form onSubmit={visualForm.handleSubmit(handleSaveVisual)}>
              <BrandTabPanel
                icon={Palette}
                title={t("visualSection.title")}
                description={t("visualSection.description")}
                footer={
                  <TabSaveButton
                    isDirty={visualForm.formState.isDirty}
                    isPending={isSavingBrand}
                    label={t("saveButton")}
                    savingLabel={t("saving")}
                  />
                }
              >
                <div className="flex flex-col gap-4">
                  <FormField
                    control={visualForm.control}
                    name="palette"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("visualSection.palette")}</FormLabel>
                        <FormControl>
                          <PaletteEditor
                            value={field.value}
                            onChange={field.onChange}
                            disabled={isSavingBrand}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={visualForm.control}
                    name="visualStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("visualSection.visualStyle")}</FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(value) =>
                            field.onChange(value === "" ? null : value)
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t("visualSection.visualStylePlaceholder")}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {visualStyleValues.map((style) => (
                              <SelectItem key={style} value={style}>
                                {t(`visualStyles.${style}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={visualForm.control}
                    name="typography"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("visualSection.typography")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("visualSection.typographyPlaceholder")}
                            value={field.value ?? ""}
                            onChange={(event) =>
                              field.onChange(
                                event.target.value === ""
                                  ? null
                                  : event.target.value,
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </BrandTabPanel>
            </form>
          </Form>

          <BrandTabPanel
            icon={ImageIcon}
            title={t("assetsSection.title")}
            description={t("assetsSection.description")}
          >
            <BrandAssetsGrid assets={brand.brandAssets ?? []} />
          </BrandTabPanel>
        </div>
      </TabsContent>

      <TabsContent value="business" className="animate-in fade-in duration-200">
        <Form {...businessForm}>
          <form onSubmit={businessForm.handleSubmit(handleSaveBusiness)}>
            <BrandTabPanel
              icon={Building2}
              title={t("businessSection.title")}
              description={t("businessSection.description")}
              footer={
                <TabSaveButton
                  isDirty={businessForm.formState.isDirty}
                  isPending={isSavingBusiness}
                  label={t("saveButton")}
                  savingLabel={t("saving")}
                />
              }
            >
              <div className="flex flex-col gap-4">
                <FormField
                  control={businessForm.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("businessSection.companyName")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("businessSection.companyNamePlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={businessForm.control}
                  name="niche"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("businessSection.niche")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("businessSection.nichePlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={businessForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("businessSection.description")}</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder={t("businessSection.descriptionPlaceholder")}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </BrandTabPanel>
          </form>
        </Form>
      </TabsContent>

      <TabsContent value="audience" className="animate-in fade-in duration-200">
        <Form {...audienceForm}>
          <form onSubmit={audienceForm.handleSubmit(handleSaveAudience)}>
            <BrandTabPanel
              icon={Target}
              title={t("audienceSection.title")}
              description={t("audienceSection.description")}
              footer={
                <TabSaveButton
                  isDirty={audienceForm.formState.isDirty}
                  isPending={isSavingBrand}
                  label={t("saveButton")}
                  savingLabel={t("saving")}
                />
              }
            >
              <div className="flex flex-col gap-4">
                <FormField
                  control={audienceForm.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("audienceSection.targetAudience")}</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder={t("audienceSection.targetAudiencePlaceholder")}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={audienceForm.control}
                  name="marketingObjective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("audienceSection.marketingObjective")}
                      </FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(value) =>
                          field.onChange(value === "" ? null : value)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                "audienceSection.marketingObjectivePlaceholder",
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {marketingObjectiveValues.map((objective) => (
                            <SelectItem key={objective} value={objective}>
                              {t(`marketingObjectives.${objective}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </BrandTabPanel>
          </form>
        </Form>
      </TabsContent>

      <TabsContent value="voice" className="animate-in fade-in duration-200">
        <Form {...voiceForm}>
          <form onSubmit={voiceForm.handleSubmit(handleSaveVoice)}>
            <BrandTabPanel
              icon={MessageSquareText}
              title={t("voiceSection.title")}
              description={t("voiceSection.description")}
              footer={
                <TabSaveButton
                  isDirty={voiceForm.formState.isDirty}
                  isPending={isSavingBrand}
                  label={t("saveButton")}
                  savingLabel={t("saving")}
                />
              }
            >
              <FormField
                control={voiceForm.control}
                name="brandVoice"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder={t("voice.placeholder")}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </BrandTabPanel>
          </form>
        </Form>
      </TabsContent>

      <TabsContent value="social" className="animate-in fade-in duration-200">
        <Form {...socialForm}>
          <form onSubmit={socialForm.handleSubmit(handleSaveSocial)}>
            <BrandTabPanel
              icon={Share2}
              title={t("socialNetworks.title")}
              description={t("socialNetworks.description")}
              footer={
                <TabSaveButton
                  isDirty={socialForm.formState.isDirty}
                  isPending={isSavingBrand}
                  label={t("saveButton")}
                  savingLabel={t("saving")}
                />
              }
            >
              <FormField
                control={socialForm.control}
                name="socialNetworks"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <SocialNetworkPicker
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isSavingBrand}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </BrandTabPanel>
          </form>
        </Form>
      </TabsContent>

      <TabsContent value="offer" className="animate-in fade-in duration-200">
        <Form {...offerForm}>
          <form onSubmit={offerForm.handleSubmit(handleSaveOffer)}>
            <BrandTabPanel
              icon={Package}
              title={t("offerSection.title")}
              description={t("offerSection.description")}
              footer={
                <TabSaveButton
                  isDirty={offerForm.formState.isDirty}
                  isPending={isSavingBrand}
                  label={t("saveButton")}
                  savingLabel={t("saving")}
                />
              }
            >
              <div className="flex flex-col gap-4">
                <FormField
                  control={offerForm.control}
                  name="mainProducts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("offerSection.mainProducts")}</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder={t("offerSection.mainProductsPlaceholder")}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={offerForm.control}
                  name="differentiators"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("offerSection.differentiators")}</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder={t("offerSection.differentiatorsPlaceholder")}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </BrandTabPanel>
          </form>
        </Form>
      </TabsContent>
    </Tabs>
  );
}
