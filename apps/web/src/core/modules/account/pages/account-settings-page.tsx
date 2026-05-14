"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  useChangePassword,
  useUpdateProfile,
} from "src/core/modules/account/hooks/use-account";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
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
import { Avatar, AvatarFallback } from "src/core/shared/components/ui/avatar";
import { authClient } from "src/core/shared/utils/auth-client";

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

const profileSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(120),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function ProfileCard() {
  const { data: session } = authClient.useSession();
  const updateProfile = useUpdateProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    defaultValues: { name: session?.user?.name ?? "" },
  });

  useEffect(() => {
    if (session?.user?.name) {
      form.reset({ name: session.user.name });
    }
  }, [session?.user?.name, form]);

  const user = session?.user;
  const initials = getInitials(user?.name, user?.email ?? "");

  async function onSubmit(values: ProfileFormValues) {
    await updateProfile.mutateAsync({ name: values.name });
  }

  return (
    <Card className="border-[var(--line-default)] bg-[var(--bg-base)]">
      <CardHeader className="p-6">
        <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
          Perfil
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <div className="mb-6 flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="text-[14px]">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[14px] font-medium text-[var(--fg-primary)]">
              {user?.name ?? "—"}
            </p>
            <p className="text-[13px] text-[var(--fg-tertiary)]">
              {user?.email}
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[var(--fg-secondary)]">
                Email
              </p>
              <p className="text-[13px] text-[var(--fg-tertiary)]">
                {user?.email}
              </p>
              <p className="mt-1 text-[12px] text-[var(--fg-quaternary)]">
                O email não pode ser alterado.
              </p>
            </div>
            <Button
              type="submit"
              disabled={updateProfile.isPending || !form.formState.isDirty}
            >
              {updateProfile.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: z
      .string()
      .min(8, "Nova senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

function PasswordCard() {
  const changePassword = useChangePassword();

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    mode: "onBlur",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: PasswordFormValues) {
    await changePassword.mutateAsync({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    form.reset();
  }

  return (
    <Card className="border-[var(--line-default)] bg-[var(--bg-base)]">
      <CardHeader className="p-6">
        <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
          Alterar senha
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha atual</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova senha</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar nova senha</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? "Alterando..." : "Alterar senha"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function AccountSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--fg-primary)]">
          Configurações da conta
        </h1>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Gerencie as informações pessoais da sua conta.
        </p>
      </div>

      <ProfileCard />
      <PasswordCard />
    </div>
  );
}
