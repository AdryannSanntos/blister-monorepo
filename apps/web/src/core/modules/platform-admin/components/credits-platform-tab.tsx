"use client";

import type { PlatformCompany } from "@company-os/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "src/core/shared/components/ui/button";
import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import { z } from "zod";

import {
  usePlatformCompanies,
  usePlatformSettings,
  useUpdateCreditSettings,
} from "../hooks/use-platform-settings";

const schema = z.object({
  freeTierAmount: z.coerce.number().positive(),
  markupDefault: z.coerce.number().positive(),
  minRunCost: z.coerce.number().positive(),
});

type CreditSettingsFormInput = z.input<typeof schema>;
type CreditSettingsFormOutput = z.output<typeof schema>;

export function CreditsPlatformTab() {
  const t = useTranslations("platformAdmin.creditsTab");
  const { data: settings, isLoading } = usePlatformSettings();
  const { mutateAsync: updateSettings, isPending } = useUpdateCreditSettings();
  const { data: companies } = usePlatformCompanies();

  const form = useForm<
    CreditSettingsFormInput,
    unknown,
    CreditSettingsFormOutput
  >({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { freeTierAmount: 20, markupDefault: 1.2, minRunCost: 0.01 },
  });

  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (!settings?.credits) return;

    if (hasHydratedRef.current && form.formState.isDirty) return;

    form.reset({
      freeTierAmount: parseFloat(settings.credits.freeTierAmount),
      markupDefault: parseFloat(settings.credits.markupDefault),
      minRunCost: parseFloat(settings.credits.minRunCost),
    });
    hasHydratedRef.current = true;
  }, [settings?.credits, form]);

  const companyColumns: ColumnDef<PlatformCompany>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: t("companyNameColumn"),
        meta: { label: t("companyNameColumn") },
      },
      {
        accessorKey: "ownerEmail",
        header: t("ownerEmailColumn"),
        meta: { label: t("ownerEmailColumn") },
        cell: ({ row }) => (
          <span className="text-xs text-[var(--fg-secondary)]">
            {row.original.ownerEmail}
          </span>
        ),
      },
      {
        accessorKey: "creditBalance",
        header: t("balanceColumn"),
        meta: { label: t("balanceColumn") },
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            US${" "}
            {row.original.creditBalance
              ? parseFloat(row.original.creditBalance).toFixed(2)
              : "0.00"}
          </span>
        ),
      },
    ],
    [t],
  );

  const handleSubmit = async (data: CreditSettingsFormOutput) => {
    try {
      await updateSettings(data);
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveError"));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-medium">{t("globalSettingsTitle")}</h3>
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-[var(--bg-sunken)]" />
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex max-w-md flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="freeTierAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("freeTierLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
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
                name="markupDefault"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("markupLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
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
                name="minRunCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("minCostLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value as number}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending} className="w-fit">
                {isPending ? t("saving") : t("submitButton")}
              </Button>
            </form>
          </Form>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-medium">{t("companiesTitle")}</h3>
        <DataTable
          columns={companyColumns}
          data={companies?.items ?? []}
          emptyState={{
            icon: Building2,
            title: t("noCompanies"),
            description: t("noCompaniesDescription"),
          }}
        />
      </section>
    </div>
  );
}
