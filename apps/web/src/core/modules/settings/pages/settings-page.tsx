"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Coins, KeyRound, Settings, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Link } from "@/i18n/routing";
import { useBlisterOsStore } from "src/core/modules/blister-os/stores/blister-os-store";
import { useCompany } from "src/core/modules/company/hooks/use-company";
import { useCredits } from "src/core/modules/credits/hooks/use-credits";
import { CompanyDangerZone } from "src/core/modules/workspace/components/company-danger-zone";
import { CompanyGeneralForm } from "src/core/modules/workspace/components/company-general-form";
import { PermissionGate } from "src/core/shared/components/permission-gate";
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
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { SectionCard } from "src/core/shared/components/ui/section-card";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { toast } from "sonner";

const settingsSchema = z.object({
  displayName: z.string().min(1),
  niche: z.string().min(1),
  audience: z.string().min(1),
  voice: z.string().min(1),
  positioning: z.string().min(1),
  contentPreferences: z.string().min(1),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const emptyDefaults: SettingsFormValues = {
  displayName: "",
  niche: "",
  audience: "",
  voice: "",
  positioning: "",
  contentPreferences: "",
};

export const SettingsPage = () => {
  const t = useTranslations("settings");
  const settings = useBlisterOsStore((state) => state.settings);
  const updateSettings = useBlisterOsStore((state) => state.updateSettings);
  const { data: credits, isLoading: isCreditsLoading } = useCredits();
  const { data: company } = useCompany();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    mode: "onBlur",
    defaultValues: emptyDefaults,
  });

  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (hasHydratedRef.current && form.formState.isDirty) return;

    form.reset({
      displayName: settings.displayName,
      niche: settings.niche,
      audience: settings.audience,
      voice: settings.voice,
      positioning: settings.positioning,
      contentPreferences: settings.contentPreferences,
    });
    hasHydratedRef.current = true;
  }, [settings, form]);

  const handleSubmit = form.handleSubmit((values) => {
    updateSettings(values);
    toast.success(t("saved"));
  });

  const balance = credits?.balance?.amount ?? null;

  return (
    <div data-testid="settings-page">
      <PageLayout icon={Settings} title={t("title")} description={t("description")}>
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            icon={Settings}
            title={t("contextTitle")}
            description={t("contextDescription")}
          >
            <Form {...form}>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {(
                  [
                    ["displayName", Input],
                    ["niche", Input],
                    ["audience", Input],
                    ["voice", Textarea],
                    ["positioning", Textarea],
                    ["contentPreferences", Textarea],
                  ] as const
                ).map(([name, Component]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t(`fields.${name}`)}</FormLabel>
                        <FormControl>
                          <Component {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <Button type="submit">{t("save")}</Button>
              </form>
            </Form>
          </SectionCard>

          <div className="flex flex-col gap-6">
            <SectionCard icon={Coins} title={t("creditsTitle")} description={t("creditsDescription")}>
              {isCreditsLoading ? (
                <Skeleton className="h-10 w-32" />
              ) : (
                <Paragraph>
                  {t("creditsBalance", { amount: balance ?? "—" })}
                </Paragraph>
              )}
              <Button variant="outline" size="sm" asChild className="mt-3 w-fit">
                <Link href="/dashboard/credits">{t("viewCredits")}</Link>
              </Button>
            </SectionCard>

            <PermissionGate permission="member.read">
              <SectionCard icon={Users} title={t("teamTitle")} description={t("teamDescription")}>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/workspace/team">{t("manageTeam")}</Link>
                </Button>
              </SectionCard>
            </PermissionGate>

            <PermissionGate permission="role.read">
              <SectionCard
                icon={KeyRound}
                title={t("permissionsTitle")}
                description={t("permissionsDescription")}
              >
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/workspace/permissions">{t("managePermissions")}</Link>
                </Button>
              </SectionCard>
            </PermissionGate>
          </div>
        </div>

        <PermissionGate permission="company.read">
          <SectionCard
            icon={Settings}
            title={t("companyTitle")}
            description={t("companyDescription")}
          >
            {company ? (
              <div className="flex flex-col gap-6">
                <CompanyGeneralForm company={company} />
                <CompanyDangerZone company={company} />
              </div>
            ) : (
              <Skeleton className="h-48 w-full rounded-lg" />
            )}
          </SectionCard>
        </PermissionGate>
      </PageLayout>
    </div>
  );
};
