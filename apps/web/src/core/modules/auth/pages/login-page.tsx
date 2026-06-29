"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthBrandHeader } from "src/core/modules/auth/components/auth-brand-header";
import { AuthSplitLayout } from "src/core/modules/auth/components/auth-split-layout";
import { Button } from "src/core/shared/components/ui/button";
import { Checkbox } from "src/core/shared/components/ui/checkbox";
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
import { resolvePostLoginNavigation } from "src/core/modules/auth/utils/post-login-bootstrap";
import { authClient } from "src/core/shared/utils/auth-client";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
  rememberLogin: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const rememberedLoginKey = "blister:remembered-login-email";

function getRememberedLoginEmail() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(rememberedLoginKey) ?? "";
}

function persistRememberedLoginEmail(values: LoginFormValues) {
  if (typeof window === "undefined") return;

  if (values.rememberLogin) {
    window.localStorage.setItem(rememberedLoginKey, values.email);
    return;
  }

  window.localStorage.removeItem(rememberedLoginKey);
}

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
      rememberLogin: false,
    },
  });

  useEffect(() => {
    const rememberedEmail = getRememberedLoginEmail();
    if (!rememberedEmail) return;

    form.setValue("email", rememberedEmail);
    form.setValue("rememberLogin", true);
  }, [form]);

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    try {
      const { error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      if (error) {
        toast.error(error.message ?? "Email ou senha incorretos.");
        return;
      }

      persistRememberedLoginEmail(values);

      const explicitRedirect =
        searchParams.get("redirect") ?? searchParams.get("next");
      const destination = await resolvePostLoginNavigation(explicitRedirect);
      router.push(destination);
      router.refresh();
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthSplitLayout>
      <AuthBrandHeader />

      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[var(--fg-primary)]">
          Bem-vindo de volta
        </h1>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Entre na sua conta para continuar
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
                  <PasswordInput
                    placeholder="Sua senha"
                    autoComplete="current-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rememberLogin"
            render={({ field }) => (
              <FormItem className="flex-row items-center gap-2.5">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="cursor-pointer font-normal text-[13px] text-[var(--fg-secondary)] leading-none">
                  Lembrar email neste dispositivo
                </FormLabel>
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Form>
    </AuthSplitLayout>
  );
}
