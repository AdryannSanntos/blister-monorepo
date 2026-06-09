"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { CompanyResponse } from "@company-os/types";
import { useUpdateCompany } from "src/core/modules/company/hooks/use-company";
import { SectionCard } from "src/core/shared/components/ui/section-card";
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
import { PermissionGate } from "src/core/shared/components/permission-gate";

type Values = {
  name: string;
};

type CompanyGeneralFormProps = {
  company: CompanyResponse;
};

export function CompanyGeneralForm({ company }: CompanyGeneralFormProps) {
  const updateCompany = useUpdateCompany();
  const t = useTranslations("workspace.settings.general");
  const tValidation = useTranslations("validation");

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, tValidation("nameMin")).max(120),
      }),
    [tValidation],
  );

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { name: company.name },
  });

  useEffect(() => {
    form.reset({ name: company.name });
  }, [company.name, form]);

  const handleSubmit = async (values: Values) => {
    await updateCompany.mutateAsync(values);
  };

  return (
    <SectionCard icon={Building2} title={t("title")} description={t("description")}>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-5"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("companyName")}</FormLabel>
                  <FormControl>
                    <PermissionGate
                      permission="company.update"
                      fallback={
                        <Input {...field} readOnly className="bg-[var(--bg-sunken)]" />
                      }
                    >
                      <Input placeholder={t("companyNamePlaceholder")} {...field} />
                    </PermissionGate>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[var(--fg-secondary)]">
                {t("slug")}
              </p>
              <p className="text-[13px] text-[var(--fg-tertiary)]">{company.slug}</p>
              <p className="mt-1 text-[12px] text-[var(--fg-quaternary)]">
                {t("slugReadonly")}
              </p>
            </div>

            <PermissionGate permission="company.update">
              <Button
                type="submit"
                disabled={updateCompany.isPending || !form.formState.isDirty}
              >
                {updateCompany.isPending ? t("saving") : t("save")}
              </Button>
            </PermissionGate>
          </form>
        </Form>
    </SectionCard>
  );
}
