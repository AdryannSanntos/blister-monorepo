'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AuthBrandHeader } from 'src/core/modules/auth/components/auth-brand-header';
import { AuthSplitLayout } from 'src/core/modules/auth/components/auth-split-layout';
import { buildEmailVerificationCallbackURL } from 'src/core/modules/auth/utils/verify-email-state';
import { Button } from 'src/core/shared/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from 'src/core/shared/components/ui/form';
import { Input } from 'src/core/shared/components/ui/input';
import { PasswordInput } from 'src/core/shared/components/ui/password-input';
import { PasswordStrength } from 'src/core/shared/components/ui/password-strength';
import { authClient } from 'src/core/shared/utils/auth-client';
import { z } from 'zod';

const signupSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z
      .string()
      .min(8, 'Senha deve ter pelo menos 8 caracteres')
      .regex(/[A-Z]/, 'Inclua pelo menos uma letra maiúscula')
      .regex(/[0-9]/, 'Inclua pelo menos um número')
      .regex(/[^A-Za-z0-9]/, 'Inclua pelo menos um caractere especial'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const [isLoading, setIsLoading] = useState(false);
  const loginCallbackURL =
    typeof window !== 'undefined'
      ? buildEmailVerificationCallbackURL(window.location.origin, redirectPath)
      : 'http://localhost:3000/auth/verify-email?status=success';

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur',
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const passwordValue = form.watch('password');

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
        toast.error(error.message ?? 'Erro ao criar conta. Tente novamente.');
        return;
      }

      toast.success('Conta criada com sucesso!');
      const verifyUrl = new URL('/auth/verify-email', window.location.origin);
      verifyUrl.searchParams.set('email', values.email);
      if (redirectPath) verifyUrl.searchParams.set('redirect', redirectPath);
      router.push(verifyUrl.pathname + verifyUrl.search);
    } catch {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthSplitLayout>
      <AuthBrandHeader />

      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[var(--fg-primary)]">Crie sua conta</h1>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">Preencha os dados para começar</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome completo</FormLabel>
                <FormControl>
                  <Input placeholder="Seu nome completo" autoComplete="name" {...field} />
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
                  <PasswordInput
                    placeholder="Crie uma senha forte"
                    autoComplete="new-password"
                    {...field}
                  />
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
                  <PasswordInput
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Criando conta...' : 'Criar conta'}
          </Button>
        </form>
      </Form>

      <p className="mt-6 text-center text-[13px] text-[var(--fg-tertiary)]">
        Já tem uma conta?{' '}
        <Link
          href="/auth/login"
          className="text-[var(--fg-primary)] underline-offset-4 hover:underline font-medium"
        >
          Entrar
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
