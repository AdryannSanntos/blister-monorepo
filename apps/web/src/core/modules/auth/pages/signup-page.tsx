"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { PasswordStrength } from "src/core/shared/components/ui/password-strength";
import { buildEmailVerificationCallbackURL } from "src/core/modules/auth/utils/verify-email-state";
import { authClient } from "src/core/shared/utils/auth-client";
import { z } from "zod";

const signupSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z
      .string()
      .min(8, "Senha deve ter pelo menos 8 caracteres")
      .regex(/[A-Z]/, "Inclua pelo menos uma letra maiúscula")
      .regex(/[0-9]/, "Inclua pelo menos um número")
      .regex(/[^A-Za-z0-9]/, "Inclua pelo menos um caractere especial"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const loginCallbackURL =
    typeof window !== "undefined"
      ? buildEmailVerificationCallbackURL(window.location.origin)
      : "http://localhost:3000/auth/verify-email?status=success";

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const passwordValue = form.watch("password");

  async function onSubmit(values: SignupFormValues) {
    setIsLoading(true);
    try {
      const { error } = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
        callbackURL: loginCallbackURL,
      });

      if (error) {
        toast.error(error.message ?? "Erro ao criar conta. Tente novamente.");
        return;
      }

      toast.success("Conta criada com sucesso!");
      router.push(`/auth/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg-canvas)] px-4 py-8">
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex size-10 items-center justify-center rounded-[var(--r-md)] bg-primary text-primary-foreground text-lg font-semibold">
          C
        </div>
        <h1 className="mt-2 text-[15px] font-medium text-[var(--fg-primary)]">Company OS</h1>
      </div>

      <Card className="w-full max-w-[400px]">
        <CardHeader className="pb-4">
          <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">Criar sua conta</h2>
          <p className="text-[13px] text-[var(--fg-tertiary)]">Preencha os dados para começar</p>
        </CardHeader>
        <CardContent className="pb-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome" autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                    <FormLabel>Senha</FormLabel>
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
                    <FormLabel>Confirmar senha</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="Repita a senha" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Criando conta..." : "Criar conta"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center border-t border-[var(--line-subtle)] py-4">
          <p className="text-[13px] text-[var(--fg-tertiary)]">
            Já tem uma conta?{" "}
            <Link href="/auth/login" className="text-[var(--fg-primary)] underline-offset-4 hover:underline">
              Entrar
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
