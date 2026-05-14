"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsLoading(true);
    try {
      const { error } = await authClient.forgetPassword({
        email: values.email,
        redirectTo: "/auth/reset-password",
      });

      if (error) {
        form.setError("email", {
          message: error.message ?? "Erro ao enviar email. Tente novamente.",
        });
        return;
      }

      setSentTo(values.email);
    } catch {
      form.setError("email", {
        message: "Erro inesperado. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (sentTo) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Email enviado</CardTitle>
            <CardDescription>Verifique sua caixa de entrada</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--fg-secondary)]">
              Link de recuperação enviado para{" "}
              <span className="font-medium text-[var(--fg-primary)]">
                {sentTo}
              </span>
              . Clique no link recebido para redefinir sua senha.
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Link
              href="/auth/login"
              className="text-sm text-[var(--fg-tertiary)] underline-offset-4 hover:underline"
            >
              Voltar para login
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Recuperar senha</CardTitle>
          <CardDescription>
            Informe seu email para receber o link de recuperação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        {...field}
                      />
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
        <CardFooter className="justify-center">
          <Link
            href="/auth/login"
            className="text-sm text-[var(--fg-tertiary)] underline-offset-4 hover:underline"
          >
            Voltar para login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
