"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Input } from "src/core/shared/components/ui/input";
import { authClient } from "src/core/shared/utils/auth-client";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsLoading(true);
    try {
      const { error } = await authClient.forgetPassword({
        email: values.email,
        redirectTo: "/auth/reset-password",
      });

      if (error) {
        form.setError("email", { message: error.message ?? "Erro ao enviar email. Tente novamente." });
        return;
      }

      setSentTo(values.email);
    } catch {
      form.setError("email", { message: "Erro inesperado. Tente novamente." });
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

  if (sentTo) {
    return sharedLayout(
      <>
        <CardHeader className="pb-4">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <Mail className="size-5 text-[var(--accent)]" />
          </div>
          <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">Email enviado</h2>
          <p className="text-[13px] text-[var(--fg-tertiary)]">Verifique sua caixa de entrada</p>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-[13px] text-[var(--fg-secondary)]">
            Enviamos o link de recuperação para{" "}
            <span className="font-medium text-[var(--fg-primary)]">{sentTo}</span>.
            Clique no link para redefinir sua senha.
          </p>
          <p className="mt-2 text-[12px] text-[var(--fg-tertiary)]">
            Não encontrou? Verifique a pasta de spam.
          </p>
        </CardContent>
        <CardFooter className="justify-center border-t border-[var(--line-subtle)] py-4">
          <Link href="/auth/login" className="text-[13px] text-[var(--fg-tertiary)] underline-offset-4 hover:underline">
            Voltar para login
          </Link>
        </CardFooter>
      </>,
    );
  }

  return sharedLayout(
    <>
      <CardHeader className="pb-4">
        <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">Recuperar senha</h2>
        <p className="text-[13px] text-[var(--fg-tertiary)]">
          Informe seu email para receber o link de recuperação
        </p>
      </CardHeader>
      <CardContent className="pb-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="seu@email.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Enviando..." : "Enviar link de recuperação"}
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
