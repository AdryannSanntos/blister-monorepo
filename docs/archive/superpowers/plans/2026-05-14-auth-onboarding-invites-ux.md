# Auth / Onboarding / Invites UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Melhorar a experiência do usuário nas telas de auth, onboarding (wizard com sidebar de steps + campos ricos) e convites.

**Architecture:** Três novos componentes compartilhados (`PasswordInput`, `PasswordStrength`, `TagInput`) consumidos pelas telas. O wizard de onboarding migra para layout split-screen com sidebar. Campos de texto livres são substituídos por Select, ToggleGroup, RadioGroup, Checkbox e TagInput onde aplicável. Telas de auth ganham consistência visual com layout centralizado e logo.

**Tech Stack:** Next.js App Router, React Hook Form + Zod, Tailwind v4, shadcn/ui primitives (`Select`, `RadioGroup`, `ToggleGroup`, `Checkbox`, `InputGroup`), lucide-react, tokens CSS do design system.

---

## File Map

**Criar:**
- `src/core/shared/components/ui/password-input.tsx` — Input com toggle de visibilidade da senha
- `src/core/shared/components/ui/password-strength.tsx` — Indicador de força da senha
- `src/core/shared/components/ui/tag-input.tsx` — Input de tags (add/remove)

**Modificar:**
- `src/core/modules/auth/pages/login-page.tsx`
- `src/core/modules/auth/pages/signup-page.tsx`
- `src/core/modules/auth/pages/forgot-password-page.tsx`
- `src/core/modules/auth/pages/reset-password-page.tsx`
- `src/core/modules/auth/pages/verify-email-page.tsx`
- `src/core/modules/onboarding/components/onboarding-wizard.tsx`
- `src/core/modules/onboarding/components/steps/company-basics-step.tsx`
- `src/core/modules/onboarding/components/steps/products-services-step.tsx`
- `src/core/modules/onboarding/components/steps/target-audience-step.tsx`
- `src/core/modules/onboarding/components/steps/tone-of-voice-step.tsx`
- `src/core/modules/onboarding/components/steps/processes-rules-step.tsx`
- `src/core/modules/organization/pages/invite-list-page.tsx`
- `src/core/modules/organization/components/create-invite-dialog.tsx`
- `src/core/modules/organization/pages/accept-invite-page.tsx`

---

## Task 1: PasswordInput component

**Files:**
- Create: `src/core/shared/components/ui/password-input.tsx`

- [ ] **Criar o componente**

```tsx
"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "src/core/shared/components/ui/input-group";

type PasswordInputProps = Omit<
  React.ComponentProps<typeof InputGroupInput>,
  "type"
>;

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <InputGroup>
        <InputGroupInput
          ref={ref}
          type={visible ? "text" : "password"}
          className={className}
          {...props}
        />
        <InputGroupButton
          tabIndex={-1}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          onClick={() => setVisible((v) => !v)}
          className="mr-1"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </InputGroupButton>
      </InputGroup>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
```

---

## Task 2: PasswordStrength component

**Files:**
- Create: `src/core/shared/components/ui/password-strength.tsx`

- [ ] **Criar o componente**

```tsx
import { Check, X } from "lucide-react";
import { cn } from "src/core/shared/utils";

const rules = [
  { label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Número", test: (p: string) => /[0-9]/.test(p) },
  { label: "Caractere especial", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(password: string): number {
  return rules.filter((r) => r.test(password)).length;
}

const strengthConfig = [
  { label: "", color: "bg-[var(--line-default)]" },
  { label: "Fraca", color: "bg-destructive" },
  { label: "Razoável", color: "bg-[var(--warning)]" },
  { label: "Boa", color: "bg-[var(--warning)]" },
  { label: "Forte", color: "bg-[var(--success)]" },
];

type PasswordStrengthProps = { password: string };

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const strength = getStrength(password);
  const config = strengthConfig[strength] ?? strengthConfig[0];

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-200",
              i <= strength ? config.color : "bg-[var(--line-default)]",
            )}
          />
        ))}
      </div>
      {config.label && (
        <p className="text-[11.5px] text-[var(--fg-tertiary)]">
          Força: <span className="font-medium text-[var(--fg-secondary)]">{config.label}</span>
        </p>
      )}
      <ul className="space-y-1">
        {rules.map((rule) => {
          const passed = rule.test(password);
          return (
            <li key={rule.label} className="flex items-center gap-1.5 text-[11.5px]">
              {passed ? (
                <Check className="size-3 text-[var(--success)]" />
              ) : (
                <X className="size-3 text-[var(--fg-quaternary)]" />
              )}
              <span className={passed ? "text-[var(--fg-secondary)]" : "text-[var(--fg-quaternary)]"}>
                {rule.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

---

## Task 3: TagInput component

**Files:**
- Create: `src/core/shared/components/ui/tag-input.tsx`

- [ ] **Criar o componente**

Tags são separadas por vírgula internamente (compatível com o schema de onboarding existente que é `string`).

```tsx
"use client";

import { X } from "lucide-react";
import * as React from "react";
import { cn } from "src/core/shared/utils";

type TagInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function TagInput({ value, onChange, placeholder, className }: TagInputProps) {
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const tags = value
    ? value.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag].join(", "));
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag).join(", "));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]!);
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-9 flex-wrap gap-1.5 rounded-[var(--r-md)] border border-input bg-transparent px-3 py-2 text-[13px] shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-[var(--r-sm)] bg-[var(--bg-raised)] px-2 py-0.5 text-[12px] text-[var(--fg-secondary)]"
        >
          {tag}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => removeTag(tag)}
            className="text-[var(--fg-quaternary)] hover:text-[var(--fg-primary)]"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(input)}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="min-w-[120px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
```

---

## Task 4: Login page

**Files:**
- Modify: `src/core/modules/auth/pages/login-page.tsx`

- [ ] **Reescrever login-page.tsx com PasswordInput e layout polido**

```tsx
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
        <h1 className="mt-2 text-[15px] font-medium text-[var(--fg-primary)]">Workana AI</h1>
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
```

---

## Task 5: Signup page

**Files:**
- Modify: `src/core/modules/auth/pages/signup-page.tsx`

- [ ] **Reescrever signup-page.tsx com PasswordInput, PasswordStrength e watch**

```tsx
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
        <h1 className="mt-2 text-[15px] font-medium text-[var(--fg-primary)]">Workana AI</h1>
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
```

---

## Task 6: Forgot password + Reset password + Verify email

**Files:**
- Modify: `src/core/modules/auth/pages/forgot-password-page.tsx`
- Modify: `src/core/modules/auth/pages/reset-password-page.tsx`
- Modify: `src/core/modules/auth/pages/verify-email-page.tsx`

- [ ] **Reescrever forgot-password-page.tsx com layout polido e ícone no estado de sucesso**

```tsx
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
        <h1 className="mt-2 text-[15px] font-medium text-[var(--fg-primary)]">Workana AI</h1>
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
```

- [ ] **Reescrever reset-password-page.tsx com PasswordInput e PasswordStrength**

```tsx
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
        <h1 className="mt-2 text-[15px] font-medium text-[var(--fg-primary)]">Workana AI</h1>
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
```

- [ ] **Reescrever verify-email-page.tsx com layout polido e ícone Mail**

```tsx
"use client";

import { Mail, MailCheck, MailX } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "src/core/shared/components/ui/card";
import {
  buildEmailVerificationCallbackURL,
  getVerifyEmailViewState,
} from "src/core/modules/auth/utils/verify-email-state";
import { authClient } from "src/core/shared/utils/auth-client";

export function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const state = getVerifyEmailViewState(new URLSearchParams(searchParams));
  const [isResending, setIsResending] = useState(false);
  const verificationCallbackURL =
    typeof window !== "undefined"
      ? buildEmailVerificationCallbackURL(window.location.origin)
      : "http://localhost:3000/auth/verify-email?status=success";

  async function handleResend() {
    if (!state.email) {
      toast.error("Email não encontrado. Volte para o cadastro.");
      return;
    }

    setIsResending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: state.email,
        callbackURL: verificationCallbackURL,
      });

      if (error) {
        toast.error(error.message ?? "Erro ao reenviar email. Tente novamente.");
        return;
      }

      toast.success(`Email de verificação reenviado para ${state.email}.`);
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsResending(false);
    }
  }

  const sharedLayout = (children: React.ReactNode) => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg-canvas)] px-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex size-10 items-center justify-center rounded-[var(--r-md)] bg-primary text-primary-foreground text-lg font-semibold">
          C
        </div>
        <h1 className="mt-2 text-[15px] font-medium text-[var(--fg-primary)]">Workana AI</h1>
      </div>
      <Card className="w-full max-w-[400px]">{children}</Card>
    </div>
  );

  if (state.kind === "success") {
    return sharedLayout(
      <>
        <CardHeader className="pb-4">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--success)_15%,transparent)]">
            <MailCheck className="size-5 text-[var(--success)]" />
          </div>
          <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">{state.title}</h2>
          <p className="text-[13px] text-[var(--fg-tertiary)]">{state.description}</p>
        </CardHeader>
        <CardContent className="pb-4">
          <Button asChild className="w-full">
            <Link href="/auth/login">Ir para login</Link>
          </Button>
        </CardContent>
      </>,
    );
  }

  if (state.kind === "error") {
    return sharedLayout(
      <>
        <CardHeader className="pb-4">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <MailX className="size-5 text-destructive" />
          </div>
          <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">{state.title}</h2>
          <p className="text-[13px] text-[var(--fg-tertiary)]">{state.description}</p>
        </CardHeader>
        <CardContent className="pb-4">
          <Button asChild className="w-full">
            <Link href="/auth/login">Ir para login</Link>
          </Button>
        </CardContent>
      </>,
    );
  }

  return sharedLayout(
    <>
      <CardHeader className="pb-4">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--accent-soft)]">
          <Mail className="size-5 text-[var(--accent)]" />
        </div>
        <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">{state.title}</h2>
        <p className="text-[13px] text-[var(--fg-tertiary)]">{state.description}</p>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <p className="text-[13px] text-[var(--fg-secondary)]">
          Enviamos um link de verificação para{" "}
          {state.email ? (
            <span className="font-medium text-[var(--fg-primary)]">{state.email}</span>
          ) : (
            "seu email"
          )}
          . Clique no link para ativar sua conta.
        </p>
        <p className="text-[12px] text-[var(--fg-tertiary)]">
          Não encontrou? Verifique a pasta de spam ou reenvie abaixo.
        </p>
        <Button variant="outline" className="w-full" onClick={handleResend} disabled={isResending}>
          {isResending ? "Reenviando..." : "Reenviar email de verificação"}
        </Button>
      </CardContent>
      <CardFooter className="justify-center border-t border-[var(--line-subtle)] py-4">
        <Link href="/auth/login" className="text-[13px] text-[var(--fg-tertiary)] underline-offset-4 hover:underline">
          Voltar para login
        </Link>
      </CardFooter>
    </>,
  );
}
```

---

## Task 7: Onboarding wizard — layout com sidebar

**Files:**
- Modify: `src/core/modules/onboarding/components/onboarding-wizard.tsx`

- [ ] **Reescrever onboarding-wizard.tsx com layout split-screen**

O layout: `min-h-screen flex`. Sidebar esquerda fixa `w-[280px]` com lista de steps. Área direita `flex-1 overflow-y-auto` com conteúdo e footer.

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  buildOnboardingDraftData,
  defaultOnboardingFormValues,
  getOnboardingFormValues,
  type OnboardingFormValues,
  onboardingFormSchema,
  onboardingStepFields,
} from "src/core/modules/onboarding/components/onboarding-form-schema";
import {
  useOnboardingDraft,
  usePublishOnboarding,
  useSaveOnboardingDraft,
} from "src/core/modules/onboarding/hooks/use-onboarding";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { Button } from "src/core/shared/components/ui/button";
import { Form } from "src/core/shared/components/ui/form";
import { authClient } from "src/core/shared/utils/auth-client";
import { cn } from "src/core/shared/utils";
import { CompanyBasicsStep } from "./steps/company-basics-step";
import { DifferentialsFaqStep } from "./steps/differentials-faq-step";
import { PositioningStep } from "./steps/positioning-step";
import { ProcessesRulesStep } from "./steps/processes-rules-step";
import { ProductsServicesStep } from "./steps/products-services-step";
import { ReviewPublishStep } from "./steps/review-publish-step";
import { TargetAudienceStep } from "./steps/target-audience-step";
import { ToneOfVoiceStep } from "./steps/tone-of-voice-step";
import { WelcomeStep } from "./steps/welcome-step";

const STEP_KEYS = [
  "welcome",
  "company-basics",
  "positioning",
  "products-services",
  "target-audience",
  "tone-of-voice",
  "differentials-faq",
  "processes-rules",
  "review-publish",
] as const;

const STEP_LABELS = [
  "Boas-vindas",
  "Dados básicos",
  "Posicionamento",
  "Produtos",
  "Público-alvo",
  "Tom de voz",
  "Diferenciais",
  "Processos",
  "Revisão",
];

const STEP_DESCRIPTIONS = [
  "Conheça o Workana AI",
  "Nome, segmento e site",
  "Missão, visão e proposta",
  "Produtos e precificação",
  "Perfil do cliente ideal",
  "Como sua marca fala",
  "Diferenciais e FAQ",
  "Ferramentas e regras",
  "Confirme e publique",
];

const TOTAL_STEPS = STEP_KEYS.length;

function getErrorMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(getErrorMessage).filter(Boolean).join(" ");
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (Array.isArray(record.message)) return getErrorMessage(record.message);
  }
  return "";
}

export function OnboardingWizard() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { activeOrgId, isLoaded: isActiveOrgLoaded } = useActiveOrganization();
  const { data: draft, isLoading } = useOnboardingDraft(activeOrgId);
  const saveMutation = useSaveOnboardingDraft(activeOrgId);
  const publishMutation = usePublishOnboarding(activeOrgId);

  const [currentStep, setCurrentStep] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    mode: "onBlur",
    defaultValues: defaultOnboardingFormValues,
  });

  useEffect(() => {
    if (isActiveOrgLoaded && !activeOrgId) router.replace("/app");
  }, [activeOrgId, isActiveOrgLoaded, router]);

  useEffect(() => {
    if (draft && !initialized) {
      setCurrentStep(draft.currentStep);
      form.reset(getOnboardingFormValues((draft.data as Record<string, unknown>) ?? {}));
      setInitialized(true);
    }
  }, [draft, form, initialized]);

  useEffect(() => {
    if (draft?.publishedAt) router.replace("/dashboard");
  }, [draft?.publishedAt, router]);

  async function save(step: number) {
    try {
      await saveMutation.mutateAsync({
        currentStep: step,
        data: buildOnboardingDraftData(form.getValues()),
      });
    } catch {
      toast.error("Erro ao salvar progresso.");
    }
  }

  async function handleNext() {
    const stepFields = onboardingStepFields[STEP_KEYS[currentStep] as keyof typeof onboardingStepFields];
    if (stepFields) {
      const isValid = await form.trigger([...stepFields], { shouldFocus: true });
      if (!isValid) return;
    }
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    await save(nextStep);
  }

  async function handleBack() {
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    await save(prevStep);
  }

  async function handlePublish() {
    if (!session?.user?.id) return;
    try {
      await save(currentStep);
      await publishMutation.mutateAsync(session.user.id);
      toast.success("Brain publicado com sucesso!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: unknown } } };
      const message = getErrorMessage(error?.response?.data?.message).toLowerCase();
      if (message.includes("owner")) {
        toast.error("Apenas o owner pode publicar o onboarding.");
      } else if (message.includes("already")) {
        toast.error("O onboarding já foi publicado.");
        router.push("/dashboard");
      } else {
        toast.error("Erro ao publicar. Tente novamente.");
      }
    }
  }

  if (isLoading || !initialized || !isActiveOrgLoaded || !activeOrgId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOTAL_STEPS - 1;
  const stepKey = STEP_KEYS[currentStep];
  const reviewData = buildOnboardingDraftData(form.getValues());

  return (
    <div className="flex min-h-screen bg-[var(--bg-canvas)]">
      {/* Sidebar */}
      <aside className="hidden w-[280px] shrink-0 flex-col border-r border-[var(--line-subtle)] bg-[var(--bg-base)] lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-[var(--line-subtle)] px-6">
          <div className="flex size-7 items-center justify-center rounded-[var(--r-sm)] bg-primary text-primary-foreground text-[12px] font-semibold">
            C
          </div>
          <span className="text-[13px] font-medium text-[var(--fg-primary)]">Workana AI</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-3 px-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--fg-quaternary)]">
            Brain
          </p>
          <ul className="space-y-0.5">
            {STEP_KEYS.map((key, index) => {
              const isDone = index < currentStep;
              const isCurrent = index === currentStep;
              return (
                <li key={key}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-[var(--r-md)] px-3 py-2.5 text-[13px] transition-colors",
                      isCurrent && "bg-[var(--accent-soft)] text-[var(--accent)]",
                      !isCurrent && isDone && "text-[var(--fg-secondary)]",
                      !isCurrent && !isDone && "text-[var(--fg-quaternary)]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                        isCurrent && "border-[var(--accent)] bg-[var(--accent)] text-white",
                        isDone && !isCurrent && "border-[var(--success)] bg-[var(--success)] text-white",
                        !isCurrent && !isDone && "border-[var(--line-default)] text-[var(--fg-quaternary)]",
                      )}
                    >
                      {isDone ? <Check className="size-3" /> : index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className={cn("truncate text-[12.5px]", isCurrent && "font-medium")}>
                        {STEP_LABELS[index]}
                      </p>
                      <p className="truncate text-[11px] text-[var(--fg-quaternary)]">
                        {STEP_DESCRIPTIONS[index]}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-[var(--line-subtle)] px-6 py-4">
          <p className="text-[11.5px] text-[var(--fg-quaternary)]">
            Passo {currentStep + 1} de {TOTAL_STEPS}
          </p>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-sunken)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-6 py-10 lg:px-12">
            <Form {...form}>
              {stepKey === "welcome" && <WelcomeStep />}
              {stepKey === "company-basics" && <CompanyBasicsStep form={form} />}
              {stepKey === "positioning" && <PositioningStep form={form} />}
              {stepKey === "products-services" && <ProductsServicesStep form={form} />}
              {stepKey === "target-audience" && <TargetAudienceStep form={form} />}
              {stepKey === "tone-of-voice" && <ToneOfVoiceStep form={form} />}
              {stepKey === "differentials-faq" && <DifferentialsFaqStep form={form} />}
              {stepKey === "processes-rules" && <ProcessesRulesStep form={form} />}
              {stepKey === "review-publish" && <ReviewPublishStep data={reviewData} />}
            </Form>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-[var(--line-subtle)] bg-[var(--bg-canvas)] px-6 py-4 lg:px-12">
          <div className="mx-auto flex max-w-2xl justify-between">
            <Button variant="outline" onClick={handleBack} disabled={isFirstStep}>
              Voltar
            </Button>
            {isLastStep ? (
              <Button onClick={handlePublish} disabled={publishMutation.isPending}>
                {publishMutation.isPending ? "Publicando..." : "Publicar Brain"}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Continuar"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Task 8: Onboarding — company-basics-step (industry → Select)

**Files:**
- Modify: `src/core/modules/onboarding/components/steps/company-basics-step.tsx`

- [ ] **Substituir o Input de industry por Select**

```tsx
"use client";

import type { UseFormReturn } from "react-hook-form";
import {
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
import { Textarea } from "src/core/shared/components/ui/textarea";
import type { OnboardingFormValues } from "../onboarding-form-schema";

const INDUSTRIES = [
  "Tecnologia / SaaS",
  "E-commerce / Varejo",
  "Saúde e bem-estar",
  "Educação",
  "Finanças / Fintech",
  "Imobiliário",
  "Agência / Marketing",
  "Indústria / Manufatura",
  "Logística / Transporte",
  "Alimentação / Gastronomia",
  "Consultoria / Serviços B2B",
  "Outro",
];

type Props = { form: UseFormReturn<OnboardingFormValues> };

export function CompanyBasicsStep({ form }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[20px] font-medium text-[var(--fg-primary)]">Dados básicos da empresa</h3>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Essas informações contextualizam todo o trabalho coordenado pelo Workana AI.
        </p>
      </div>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da empresa</FormLabel>
              <FormControl>
                <Input placeholder="Acme Corp" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Segmento / Indústria</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o segmento" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição breve</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Em poucas frases, o que sua empresa faz e qual problema resolve?"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website <span className="text-[var(--fg-quaternary)]">(opcional)</span></FormLabel>
              <FormControl>
                <Input placeholder="https://acme.com" type="url" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
```

---

## Task 9: Onboarding — products-services-step (pricing → RadioGroup)

**Files:**
- Modify: `src/core/modules/onboarding/components/steps/products-services-step.tsx`

- [ ] **Substituir pricing Textarea por RadioGroup de cards**

```tsx
"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { RadioGroup, RadioGroupItem } from "src/core/shared/components/ui/radio-group";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { cn } from "src/core/shared/utils";
import type { OnboardingFormValues } from "../onboarding-form-schema";

const PRICING_OPTIONS = [
  { value: "Assinatura (SaaS)", description: "Cobrança mensal ou anual recorrente" },
  { value: "One-time", description: "Pagamento único por produto ou projeto" },
  { value: "Freemium", description: "Plano grátis com upgrades pagos" },
  { value: "Sob demanda", description: "Cobrança por uso ou por hora" },
  { value: "Híbrido", description: "Combinação de modelos" },
  { value: "Outro", description: "Modelo personalizado" },
];

type Props = { form: UseFormReturn<OnboardingFormValues> };

export function ProductsServicesStep({ form }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[20px] font-medium text-[var(--fg-primary)]">Produtos e serviços</h3>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Descreva o que você vende e como cobra por isso.
        </p>
      </div>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="products"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Produtos / Serviços principais</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Liste os principais produtos ou serviços que sua empresa oferece."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="pricing"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modelo de precificação</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3"
                >
                  {PRICING_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer flex-col gap-1 rounded-[var(--r-md)] border p-3 transition-colors",
                        field.value === option.value
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--line-default)] hover:border-[var(--line-strong)] hover:bg-[var(--bg-hover)]",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value={option.value} className="shrink-0" />
                        <span className={cn(
                          "text-[12.5px] font-medium",
                          field.value === option.value ? "text-[var(--accent)]" : "text-[var(--fg-primary)]",
                        )}>
                          {option.value}
                        </span>
                      </div>
                      <p className="pl-6 text-[11.5px] text-[var(--fg-tertiary)]">
                        {option.description}
                      </p>
                    </label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
```

---

## Task 10: Onboarding — target-audience-step (channels → Checkboxes)

**Files:**
- Modify: `src/core/modules/onboarding/components/steps/target-audience-step.tsx`

- [ ] **Substituir channels Textarea por checkboxes multi-select**

O campo `channels` é string no schema. Os checkboxes usam join/split por ", " internamente.

```tsx
"use client";

import type { UseFormReturn } from "react-hook-form";
import { Checkbox } from "src/core/shared/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Textarea } from "src/core/shared/components/ui/textarea";
import type { OnboardingFormValues } from "../onboarding-form-schema";

const CHANNEL_OPTIONS = [
  "Orgânico / SEO",
  "Mídia paga (Ads)",
  "Indicação / Referral",
  "Email marketing",
  "Redes sociais",
  "Parcerias / Afiliados",
  "Eventos / Webinars",
  "Outbound / SDR",
  "Produto / PLG",
];

type Props = { form: UseFormReturn<OnboardingFormValues> };

function toggleChannel(current: string, channel: string): string {
  const channels = current ? current.split(", ").filter(Boolean) : [];
  if (channels.includes(channel)) {
    return channels.filter((c) => c !== channel).join(", ");
  }
  return [...channels, channel].join(", ");
}

export function TargetAudienceStep({ form }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[20px] font-medium text-[var(--fg-primary)]">Público-alvo</h3>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Defina para quem você vende e como essas pessoas chegam até você.
        </p>
      </div>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="idealCustomer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente ideal (ICP)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva o perfil do seu cliente ideal: cargo, empresa, setor, tamanho..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="painPoints"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dores e necessidades</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Quais são as principais dores que seu produto resolve?"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="channels"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Canais de aquisição</FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CHANNEL_OPTIONS.map((channel) => {
                    const checked = field.value
                      ? field.value.split(", ").includes(channel)
                      : false;
                    return (
                      <label
                        key={channel}
                        className="flex cursor-pointer items-center gap-2 rounded-[var(--r-md)] border border-[var(--line-default)] px-3 py-2.5 text-[12.5px] text-[var(--fg-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => {
                            field.onChange(toggleChannel(field.value, channel));
                          }}
                        />
                        {channel}
                      </label>
                    );
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
```

---

## Task 11: Onboarding — tone-of-voice-step (tone → ToggleGroup, avoidWords → TagInput)

**Files:**
- Modify: `src/core/modules/onboarding/components/steps/tone-of-voice-step.tsx`

- [ ] **Substituir tone Input por ToggleGroup e avoidWords Textarea por TagInput**

```tsx
"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { TagInput } from "src/core/shared/components/ui/tag-input";
import { ToggleGroup, ToggleGroupItem } from "src/core/shared/components/ui/toggle-group";
import { Textarea } from "src/core/shared/components/ui/textarea";
import type { OnboardingFormValues } from "../onboarding-form-schema";

const TONE_OPTIONS = [
  { value: "Profissional", emoji: "💼" },
  { value: "Casual", emoji: "😊" },
  { value: "Técnico", emoji: "⚙️" },
  { value: "Acolhedor", emoji: "🤝" },
  { value: "Direto", emoji: "🎯" },
  { value: "Inspirador", emoji: "✨" },
];

type Props = { form: UseFormReturn<OnboardingFormValues> };

export function ToneOfVoiceStep({ form }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[20px] font-medium text-[var(--fg-primary)]">Tom de voz e comunicação</h3>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Como sua marca fala com o mundo. Isso guia toda a geração de conteúdo.
        </p>
      </div>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="tone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tom de voz principal</FormLabel>
              <FormControl>
                <ToggleGroup
                  type="single"
                  value={field.value}
                  onValueChange={(val) => { if (val) field.onChange(val); }}
                  className="flex flex-wrap gap-2"
                >
                  {TONE_OPTIONS.map((option) => (
                    <ToggleGroupItem
                      key={option.value}
                      value={option.value}
                      className="h-9 gap-1.5 rounded-[var(--r-md)] border border-[var(--line-default)] px-3 text-[12.5px] data-[state=on]:border-[var(--accent)] data-[state=on]:bg-[var(--accent-soft)] data-[state=on]:text-[var(--accent)]"
                    >
                      <span>{option.emoji}</span>
                      {option.value}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="communicationStyle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estilo de comunicação</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Como a empresa se comunica com clientes e parceiros? Seja específico."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="avoidWords"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Palavras ou expressões a evitar</FormLabel>
              <FormControl>
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Digite e pressione Enter para adicionar..."
                />
              </FormControl>
              <p className="text-[11.5px] text-[var(--fg-quaternary)]">
                Pressione Enter ou vírgula para adicionar cada item
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
```

---

## Task 12: Onboarding — processes-rules-step (tools → TagInput)

**Files:**
- Modify: `src/core/modules/onboarding/components/steps/processes-rules-step.tsx`

- [ ] **Substituir tools Textarea por TagInput**

```tsx
"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { TagInput } from "src/core/shared/components/ui/tag-input";
import { Textarea } from "src/core/shared/components/ui/textarea";
import type { OnboardingFormValues } from "../onboarding-form-schema";

type Props = { form: UseFormReturn<OnboardingFormValues> };

export function ProcessesRulesStep({ form }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[20px] font-medium text-[var(--fg-primary)]">Processos e regras internas</h3>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Estas informações garantem que o Workana AI respeitará como sua empresa opera.
        </p>
      </div>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="processes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Processos-chave</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva os principais processos da empresa (vendas, atendimento, operação...)."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rules"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Regras de negócio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Regras que a IA deve sempre respeitar ao gerar conteúdo ou interagir."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tools"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ferramentas utilizadas</FormLabel>
              <FormControl>
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Slack, HubSpot, Notion... pressione Enter para adicionar"
                />
              </FormControl>
              <p className="text-[11.5px] text-[var(--fg-quaternary)]">
                Pressione Enter ou vírgula para adicionar cada ferramenta
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
```

---

## Task 13: Invites — invite-list-page com empty state e badges melhores

**Files:**
- Modify: `src/core/modules/organization/pages/invite-list-page.tsx`

- [ ] **Reescrever invite-list-page.tsx**

```tsx
"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { CreateInviteDialog } from "src/core/modules/organization/components/create-invite-dialog";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import {
  useCancelInvitation,
  useInvitations,
} from "src/core/modules/organization/hooks/use-invitations";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "src/core/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "src/core/shared/components/ui/table";
import { authClient } from "src/core/shared/utils/auth-client";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" }
> = {
  pending: { label: "Pendente", variant: "warning" },
  accepted: { label: "Aceito", variant: "success" },
  cancelled: { label: "Cancelado", variant: "secondary" },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function InviteListPage() {
  const { data: session } = authClient.useSession();
  const { activeOrgId } = useActiveOrganization();
  const { data: invitations, isLoading } = useInvitations(activeOrgId);
  const cancelMutation = useCancelInvitation(activeOrgId);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!activeOrgId || !session?.user) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--line-subtle)] px-6 py-4">
          <div>
            <h2 className="text-[15px] font-medium text-[var(--fg-primary)]">Convites</h2>
            <p className="mt-0.5 text-[12.5px] text-[var(--fg-tertiary)]">
              Gerencie os convites enviados para o seu workspace.
            </p>
          </div>
          <Button size="md" onClick={() => setDialogOpen(true)}>
            <UserPlus />
            Convidar membro
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : !invitations || invitations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-[var(--bg-raised)]">
                <UserPlus className="size-5 text-[var(--fg-quaternary)]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                  Nenhum convite enviado ainda
                </p>
                <p className="mt-1 text-[12.5px] text-[var(--fg-tertiary)]">
                  Convide membros para colaborar no workspace.
                </p>
              </div>
              <Button variant="outline" size="md" onClick={() => setDialogOpen(true)}>
                <UserPlus />
                Enviar primeiro convite
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="pr-6 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => {
                  const status = statusConfig[inv.status] ?? { label: inv.status, variant: "outline" as const };
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="pl-6 font-medium text-[var(--fg-primary)]">
                        {inv.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-[var(--fg-tertiary)]">
                        {formatDate(inv.expiresAt)}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        {inv.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelMutation.mutate(inv.id)}
                            disabled={cancelMutation.isPending}
                          >
                            Cancelar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateInviteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        orgId={activeOrgId}
        inviterId={session.user.id}
      />
    </div>
  );
}
```

---

## Task 14: Invites — create-invite-dialog polido

**Files:**
- Modify: `src/core/modules/organization/components/create-invite-dialog.tsx`

- [ ] **Reescrever create-invite-dialog.tsx com header/content/footer e descrição**

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useCreateInvitation } from "src/core/modules/organization/hooks/use-invitations";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import { z } from "zod";

const inviteSchema = z.object({
  email: z
    .string()
    .email("Email inválido")
    .min(1, "Email é obrigatório"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

type CreateInviteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  inviterId: string;
};

export function CreateInviteDialog({
  open,
  onOpenChange,
  orgId,
  inviterId,
}: CreateInviteDialogProps) {
  const createMutation = useCreateInvitation(orgId);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: InviteFormValues) {
    await createMutation.mutateAsync({ inviterId, email: values.email });
    form.reset();
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) form.reset();
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Convidar membro</DialogTitle>
          <DialogDescription>
            O convidado receberá um email com link para entrar no workspace. O convite expira em 7 dias.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="py-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email do convidado</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="colega@empresa.com"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Certifique-se de que o email está correto antes de enviar.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Enviando..." : "Enviar convite"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Task 15: Invites — accept-invite-page com mais contexto

**Files:**
- Modify: `src/core/modules/organization/pages/accept-invite-page.tsx`

- [ ] **Reescrever accept-invite-page.tsx com layout polido e contexto visual**

```tsx
"use client";

import { UserCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { useAcceptInvitation } from "src/core/modules/organization/hooks/use-invitations";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "src/core/shared/components/ui/card";
import { authClient } from "src/core/shared/utils/auth-client";

export function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("invitationId") ?? "";
  const orgId = searchParams.get("orgId") ?? "";
  const { data: session } = authClient.useSession();
  const { setActiveOrgId } = useActiveOrganization();
  const acceptMutation = useAcceptInvitation();
  const [accepted, setAccepted] = useState(false);

  const loginHref = `/auth/login?redirect=${encodeURIComponent(
    `/invite/accept?invitationId=${invitationId}&orgId=${orgId}`,
  )}`;

  const sharedLayout = (children: React.ReactNode) => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg-canvas)] px-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex size-10 items-center justify-center rounded-[var(--r-md)] bg-primary text-primary-foreground text-lg font-semibold">
          C
        </div>
        <h1 className="mt-2 text-[15px] font-medium text-[var(--fg-primary)]">Workana AI</h1>
      </div>
      <Card className="w-full max-w-[420px]">{children}</Card>
    </div>
  );

  if (!invitationId || !orgId) {
    return sharedLayout(
      <>
        <CardHeader className="pb-4">
          <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">Convite inválido</h2>
          <p className="text-[13px] text-[var(--fg-tertiary)]">
            Este link de convite é inválido ou está incompleto.
          </p>
        </CardHeader>
        <CardFooter className="justify-center border-t border-[var(--line-subtle)] py-4">
          <Link href="/auth/login" className="text-[13px] text-[var(--fg-tertiary)] underline-offset-4 hover:underline">
            Ir para login
          </Link>
        </CardFooter>
      </>,
    );
  }

  if (!session?.user) {
    return sharedLayout(
      <>
        <CardHeader className="pb-4">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <UserCheck className="size-5 text-[var(--accent)]" />
          </div>
          <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">Você foi convidado</h2>
          <p className="text-[13px] text-[var(--fg-tertiary)]">
            Faça login ou crie uma conta para aceitar o convite e entrar no workspace.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <Button asChild className="w-full">
            <Link href={loginHref}>Fazer login</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href={`/auth/signup?redirect=${encodeURIComponent(`/invite/accept?invitationId=${invitationId}&orgId=${orgId}`)}`}>
              Criar conta
            </Link>
          </Button>
        </CardContent>
      </>,
    );
  }

  async function handleAccept() {
    if (!session?.user?.id) return;
    try {
      await acceptMutation.mutateAsync({
        orgId,
        invitationId,
        userId: session.user.id,
      });
      setAccepted(true);
      setActiveOrgId(orgId);
      toast.success("Convite aceito! Redirecionando...");
      setTimeout(() => router.push("/app"), 1500);
    } catch {
      // error handled in hook
    }
  }

  if (accepted) {
    return sharedLayout(
      <CardHeader className="pb-6">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--success)_15%,transparent)]">
          <UserCheck className="size-5 text-[var(--success)]" />
        </div>
        <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">Convite aceito!</h2>
        <p className="text-[13px] text-[var(--fg-tertiary)]">
          Você agora faz parte do workspace. Redirecionando...
        </p>
      </CardHeader>,
    );
  }

  return sharedLayout(
    <>
      <CardHeader className="pb-4">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--accent-soft)]">
          <UserCheck className="size-5 text-[var(--accent)]" />
        </div>
        <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">Aceitar convite</h2>
        <p className="text-[13px] text-[var(--fg-tertiary)]">
          Você foi convidado para entrar em um workspace do Workana AI.
        </p>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="mb-4 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] px-4 py-3 text-[13px] text-[var(--fg-secondary)]">
          Logado como <span className="font-medium text-[var(--fg-primary)]">{session.user.email}</span>
        </div>
        <Button className="w-full" onClick={handleAccept} disabled={acceptMutation.isPending}>
          {acceptMutation.isPending ? "Aceitando..." : "Aceitar convite"}
        </Button>
      </CardContent>
      <CardFooter className="justify-center border-t border-[var(--line-subtle)] py-4">
        <Link href="/dashboard" className="text-[13px] text-[var(--fg-tertiary)] underline-offset-4 hover:underline">
          Ir para o dashboard
        </Link>
      </CardFooter>
    </>,
  );
}
```
