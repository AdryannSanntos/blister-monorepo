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
import { authClient } from "src/core/shared/utils/auth-client";
import { z } from "zod";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.701z" />
    </svg>
  );
}

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
  rememberLogin: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SocialSignIn = {
  social: (input: {
    provider: "google";
    callbackURL: string;
  }) => Promise<{ error?: { message?: string } | null }>;
};

const rememberedLoginKey = "blister:remembered-login-email";

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function getPostLoginRedirectPath(searchParams: {
  get: (name: string) => string | null;
}) {
  return (
    getSafeRedirectPath(searchParams.get("redirect")) ??
    getSafeRedirectPath(searchParams.get("next")) ??
    "/dashboard"
  );
}

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
  const [socialLoading, setSocialLoading] = useState<"google" | null>(null);

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

  async function handleGoogleSignIn() {
    setSocialLoading("google");
    try {
      const signIn = authClient.signIn as typeof authClient.signIn &
        SocialSignIn;
      const { error } = await signIn.social({
        provider: "google",
        callbackURL: getPostLoginRedirectPath(searchParams),
      });

      if (error) {
        toast.error(error.message ?? "Não foi possível entrar com Google.");
      }
    } catch {
      toast.error("Erro inesperado ao entrar com Google.");
    } finally {
      setSocialLoading(null);
    }
  }

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
          toast.error(
            "Seu email ainda não foi verificado. Verifique sua caixa de entrada.",
          );
          router.push(
            `/auth/verify-email?email=${encodeURIComponent(values.email)}`,
          );
          return;
        }
        toast.error(error.message ?? "Email ou senha incorretos.");
        return;
      }

      persistRememberedLoginEmail(values);

      router.push(getPostLoginRedirectPath(searchParams));
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
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
              <FormItem className="flex-row items-center gap-2.5 pb-0">
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

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--line-subtle)]" />
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
          ou continue com
        </span>
        <div className="h-px flex-1 bg-[var(--line-subtle)]" />
      </div>

      <div className="space-y-2.5">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center bg-[var(--bg-base)]"
          disabled={Boolean(socialLoading) || isLoading}
          onClick={handleGoogleSignIn}
        >
          <GoogleIcon className="size-4 shrink-0" />
          {socialLoading === "google"
            ? "Conectando com Google..."
            : "Continuar com Google"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center border-black bg-black text-white shadow-none hover:bg-black/90 hover:text-white"
          disabled
          title="Login com Apple ainda não está configurado neste ambiente."
        >
          <AppleIcon className="size-4 shrink-0" />
          Continuar com Apple
        </Button>
      </div>

      <p className="mt-6 text-center text-[13px] text-[var(--fg-tertiary)]">
        Não tem uma conta?{" "}
        <Link
          href="/auth/signup"
          className="text-[var(--fg-primary)] underline-offset-4 hover:underline font-medium"
        >
          Criar conta
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
