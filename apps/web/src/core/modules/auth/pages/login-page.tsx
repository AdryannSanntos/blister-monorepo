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
import { Input } from "src/core/shared/components/ui/input";
import { PasswordInput } from "src/core/shared/components/ui/password-input";
import { authClient } from "src/core/shared/utils/auth-client";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    try {
      const { error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      if (error) {
        if (
          error.code === "EMAIL_NOT_VERIFIED" ||
          error.message?.toLowerCase().includes("email not verified") ||
          error.message?.toLowerCase().includes("email não verificado")
        ) {
          toast.error("Seu email ainda não foi verificado. Verifique sua caixa de entrada.");
          router.push(`/auth/verify-email?email=${encodeURIComponent(values.email)}`);
          return;
        }
        toast.error(error.message ?? "Email ou senha incorretos.");
        return;
      }

      const redirectPath =
        getSafeRedirectPath(searchParams.get("redirect")) ??
        getSafeRedirectPath(searchParams.get("next")) ??
        "/app";

      router.push(redirectPath);
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg-canvas)] px-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex size-10 items-center justify-center rounded-[var(--r-md)] bg-primary text-primary-foreground text-lg font-semibold">
          C
        </div>
        <h1 className="mt-2 text-[15px] font-medium text-[var(--fg-primary)]">Company OS</h1>
      </div>

      <Card className="w-full max-w-[400px]">
        <CardHeader className="pb-4">
          <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">Entrar na sua conta</h2>
          <p className="text-[13px] text-[var(--fg-tertiary)]">Informe seu email e senha para continuar</p>
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
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Senha</FormLabel>
                      <Link
                        href="/auth/forgot-password"
                        className="text-[12px] text-[var(--fg-tertiary)] underline-offset-4 hover:text-[var(--fg-secondary)] hover:underline"
                      >
                        Esqueceu a senha?
                      </Link>
                    </div>
                    <FormControl>
                      <PasswordInput placeholder="Sua senha" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center border-t border-[var(--line-subtle)] py-4">
          <p className="text-[13px] text-[var(--fg-tertiary)]">
            Não tem uma conta?{" "}
            <Link href="/auth/signup" className="text-[var(--fg-primary)] underline-offset-4 hover:underline">
              Criar conta
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
