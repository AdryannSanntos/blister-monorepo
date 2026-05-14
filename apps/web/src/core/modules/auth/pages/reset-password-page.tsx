"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "src/core/shared/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { PasswordInput } from "src/core/shared/components/ui/password-input";
import { PasswordStrength } from "src/core/shared/components/ui/password-strength";
import { authClient } from "src/core/shared/utils/auth-client";
import { z } from "zod";

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Senha deve ter pelo menos 8 caracteres")
      .regex(/[A-Z]/, "Inclua pelo menos uma letra maiúscula")
      .regex(/[0-9]/, "Inclua pelo menos um número")
      .regex(/[^A-Za-z0-9]/, "Inclua pelo menos um caractere especial"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const passwordValue = form.watch("newPassword");

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) {
      toast.error("Token de redefinição inválido ou expirado.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await authClient.resetPassword({ newPassword: values.newPassword, token });

      if (error) {
        toast.error(error.message ?? "Erro ao redefinir senha. Tente novamente.");
        return;
      }

      toast.success("Senha redefinida com sucesso!");
      router.push("/auth/login");
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  const sharedLayout = (children: React.ReactNode) => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg-canvas)] px-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex size-10 items-center justify-center rounded-[var(--r-md)] bg-primary text-primary-foreground text-lg font-semibold">
          C
        </div>
        <h1 className="mt-2 text-[15px] font-medium text-[var(--fg-primary)]">Company OS</h1>
      </div>
      <Card className="w-full max-w-[400px]">{children}</Card>
    </div>
  );

  if (!token) {
    return sharedLayout(
      <>
        <CardHeader className="pb-4">
          <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">Link inválido</h2>
          <p className="text-[13px] text-[var(--fg-tertiary)]">Este link de redefinição é inválido ou expirou</p>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-[13px] text-[var(--fg-secondary)]">
            Por favor, solicite um novo link de recuperação de senha.
          </p>
        </CardContent>
        <CardFooter className="justify-center border-t border-[var(--line-subtle)] py-4">
          <Link href="/auth/forgot-password" className="text-[13px] text-[var(--fg-primary)] underline-offset-4 hover:underline">
            Solicitar novo link
          </Link>
        </CardFooter>
      </>,
    );
  }

  return sharedLayout(
    <>
      <CardHeader className="pb-4">
        <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">Criar nova senha</h2>
        <p className="text-[13px] text-[var(--fg-tertiary)]">Defina uma nova senha para sua conta</p>
      </CardHeader>
      <CardContent className="pb-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova senha</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="Crie uma senha forte" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                  <PasswordStrength password={passwordValue} />
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
                    <PasswordInput placeholder="Repita a nova senha" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center border-t border-[var(--line-subtle)] py-4">
        <Link href="/auth/login" className="text-[13px] text-[var(--fg-tertiary)] underline-offset-4 hover:underline">
          Voltar para login
        </Link>
      </CardFooter>
    </>,
  );
}
