"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import { z } from "zod";

import {
  PLATFORM_ROLE_VALUES,
  type PlatformRole,
  useAssignPlatformRole,
} from "../hooks/use-platform-admin";

type Values = {
  userId: string;
  role: PlatformRole;
};

type AdminRoleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdminRoleDialog({ open, onOpenChange }: AdminRoleDialogProps) {
  const assignPlatformRole = useAssignPlatformRole();
  const t = useTranslations("platformAdmin.roleDialog");
  const tRoles = useTranslations("platformAdmin.roles");
  const tValidation = useTranslations("validation");
  const tCommon = useTranslations("common");

  const schema = useMemo(
    () =>
      z.object({
        userId: z.string().min(1, tValidation("userIdRequired")),
        role: z.enum(PLATFORM_ROLE_VALUES),
      }),
    [tValidation],
  );

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { userId: "", role: "platform_admin" },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (values: Values) => {
    await assignPlatformRole.mutateAsync(values);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="animate-in fade-in zoom-in-95 sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("userId")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("userIdPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("role")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("rolePlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PLATFORM_ROLE_VALUES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {tRoles(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <Button type="submit" disabled={assignPlatformRole.isPending}>
                {assignPlatformRole.isPending ? t("granting") : t("grant")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
