"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { CompanyResponse } from "@company-os/types";
import { SectionCard } from "src/core/shared/components/ui/section-card";
import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
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

import { useRouter } from "@/i18n/routing";
import { useDeleteCompany } from "../hooks/use-workspace-settings";

type CompanyDangerZoneProps = {
  company: CompanyResponse;
};

type DeleteFormValues = {
  confirmName: string;
};

export function CompanyDangerZone({ company }: CompanyDangerZoneProps) {
  const [open, setOpen] = useState(false);
  const deleteCompany = useDeleteCompany();
  const router = useRouter();
  const t = useTranslations("workspace.settings.danger");

  const schema = useMemo(
    () =>
      z.object({
        confirmName: z
          .string()
          .min(1, t("confirmRequired"))
          .refine((value) => value.trim() === company.name.trim(), {
            message: t("confirmMismatch"),
          }),
      }),
    [company.name, t],
  );

  const form = useForm<DeleteFormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { confirmName: "" },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) form.reset();
    setOpen(nextOpen);
  };

  const handleConfirmDelete = async (values: DeleteFormValues) => {
    await deleteCompany.mutateAsync({ confirmName: values.confirmName });
    handleOpenChange(false);
    router.replace("/dashboard");
  };

  return (
    <PermissionGate permission="company.delete">
      <SectionCard
        icon={AlertTriangle}
        title={t("title")}
        description={t("description")}
        className="border-[color-mix(in_oklch,var(--danger)_35%,var(--line-default))]"
        iconSurfaceClassName="bg-[color-mix(in_oklch,var(--danger)_12%,transparent)]"
        iconClassName="text-[var(--danger)]"
        titleClassName="text-[var(--danger)]"
      >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-medium text-[var(--fg-primary)]">
                {t("deleteTitle")}
              </p>
              <p className="text-[13px] text-[var(--fg-tertiary)]">
                {t("deleteDescription")}
              </p>
            </div>
            <Button variant="destructive" onClick={() => setOpen(true)}>
              {t("deleteButton")}
            </Button>
          </div>
      </SectionCard>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="animate-in fade-in zoom-in-95 sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{t("deleteDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteDialogDescription", { name: company.name })}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(handleConfirmDelete)}
            >
              <FormField
                control={form.control}
                name="confirmName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("confirmLabel", { name: company.name })}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={company.name}
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={deleteCompany.isPending}
                >
                  {deleteCompany.isPending ? t("deleting") : t("deleteConfirm")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PermissionGate>
  );
}
