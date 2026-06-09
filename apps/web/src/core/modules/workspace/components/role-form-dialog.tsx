"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { AppPermissionKey } from "@company-os/authz";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { WorkspaceRole } from "@company-os/types";
import { Button } from "src/core/shared/components/ui/button";
import { Checkbox } from "src/core/shared/components/ui/checkbox";
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

import { useCreateRole, useUpdateRole } from "../hooks/use-roles";
import { assignablePermissionGroups } from "../utils/permission-groups";

type Values = {
  name: string;
  permissions: string[];
};

type RoleFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: WorkspaceRole | null;
};

export function RoleFormDialog({
  open,
  onOpenChange,
  role,
}: RoleFormDialogProps) {
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const isEditing = Boolean(role);
  const t = useTranslations("workspace.permissions.roleDialog");
  const tGroups = useTranslations("workspace.permissions.groups");
  const tPermissions = useTranslations("workspace.permissions.keys");
  const tValidation = useTranslations("validation");
  const tCommon = useTranslations("common");

  const schema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(2, tValidation("nameMin"))
          .max(64)
          .regex(/^[a-z0-9_-]+$/i, t("nameFormat")),
        permissions: z.array(z.string()).min(1, t("permissionsRequired")),
      }),
    [tValidation],
  );

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      permissions: [],
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: role?.name ?? "",
      permissions: role?.permissions ?? [],
    });
  }, [open, role, form]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) form.reset();
    onOpenChange(nextOpen);
  };

  const selectedPermissions = form.watch("permissions");

  const handleTogglePermission = (
    permission: AppPermissionKey,
    checked: boolean,
  ) => {
    const current = form.getValues("permissions");
    if (checked) {
      form.setValue("permissions", [...current, permission], {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }
    form.setValue(
      "permissions",
      current.filter((item) => item !== permission),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const handleSubmit = async (values: Values) => {
    if (isEditing && role) {
      await updateRole.mutateAsync({
        id: role.id,
        dto: {
          name: values.name,
          permissions: values.permissions,
        },
      });
    } else {
      await createRole.mutateAsync({
        name: values.name,
        permissions: values.permissions,
      });
    }
    handleOpenChange(false);
  };

  const isPending = createRole.isPending || updateRole.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="animate-in fade-in zoom-in-95 flex max-h-[90vh] flex-col sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t("editDescription") : t("createDescription")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="flex min-h-0 flex-1 flex-col gap-4"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="min-h-0 flex-1 overflow-y-auto rounded-[var(--r-lg)] border border-[var(--line-default)] p-4">
              <p className="mb-4 text-[13px] font-medium text-[var(--fg-secondary)]">
                {t("permissions")}
              </p>
              <div className="flex flex-col gap-6">
                {assignablePermissionGroups.map((group) => (
                  <div key={group.id} className="flex flex-col gap-3">
                    <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--fg-quaternary)]">
                      {tGroups(group.labelKey)}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.permissions.map((permission) => {
                        const checked = selectedPermissions.includes(permission);
                        return (
                          <label
                            key={permission}
                            htmlFor={`perm-${permission}`}
                            className="flex cursor-pointer items-start gap-2 rounded-[var(--r-md)] border border-[var(--line-subtle)] p-3 hover:bg-[var(--bg-hover)]"
                          >
                            <Checkbox
                              id={`perm-${permission}`}
                              checked={checked}
                              onCheckedChange={(value) =>
                                handleTogglePermission(
                                  permission,
                                  value === true,
                                )
                              }
                            />
                            <span className="text-[13px] text-[var(--fg-primary)]">
                              {tPermissions(permission)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="permissions"
              render={() => (
                <FormItem>
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
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? t("saving")
                  : isEditing
                    ? t("save")
                    : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
