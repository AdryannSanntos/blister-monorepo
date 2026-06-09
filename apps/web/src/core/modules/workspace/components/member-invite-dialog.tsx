"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { WorkspaceRole } from "@company-os/types";
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

import { useInviteMember } from "../hooks/use-team";

type Values = {
  email: string;
  roleId: string;
};

type MemberInviteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: WorkspaceRole[];
};

export function MemberInviteDialog({
  open,
  onOpenChange,
  roles,
}: MemberInviteDialogProps) {
  const inviteMember = useInviteMember();
  const t = useTranslations("workspace.team.inviteDialog");
  const tValidation = useTranslations("validation");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("workspace.permissions.systemRoles");

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(tValidation("invalidEmail")),
        roleId: z.string().min(1, t("roleRequired")),
      }),
    [tValidation],
  );

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { email: "", roleId: roles[0]?.id ?? "" },
  });

  useEffect(() => {
    if (!open) {
      form.reset({ email: "", roleId: roles[0]?.id ?? "" });
    }
  }, [open, roles, form]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) form.reset();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (values: Values) => {
    await inviteMember.mutateAsync(values);
    handleOpenChange(false);
  };

  const getRoleLabel = (role: WorkspaceRole) =>
    role.isSystem ? tRoles(role.name as "owner" | "admin" | "member") : role.name;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="animate-in fade-in zoom-in-95 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("email")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t("emailPlaceholder")}
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleId"
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
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {getRoleLabel(role)}
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
              <Button type="submit" disabled={inviteMember.isPending}>
                {inviteMember.isPending ? t("submitting") : t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
