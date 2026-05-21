'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthBrandHeader } from 'src/core/modules/auth/components/auth-brand-header';
import { AuthSplitLayout } from 'src/core/modules/auth/components/auth-split-layout';
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
import { authClient } from 'src/core/shared/utils/auth-client';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsLoading(true);
    try {
      const { error } = await authClient.forgetPassword({
        email: values.email,
        redirectTo: '/auth/reset-password',
      });

      if (error) {
        form.setError('email', {
          message: error.message ?? 'Erro ao enviar email. Tente novamente.',
        });
        return;
      }

      setSentTo(values.email);
    } catch {
      form.setError('email', { message: 'Erro inesperado. Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  }

  if (sentTo) {
    return (
      <AuthSplitLayout>
        <AuthBrandHeader />

        <div className="flex size-12 items-center justify-center rounded-full bg-[var(--accent-soft)] mb-5">
          <Mail className="size-5 text-[var(--accent)]" />
        </div>

        <h1 className="text-[22px] font-semibold text-[var(--fg-primary)]">Email enviado</h1>
        <p className="mt-1 mb-6 text-[13px] text-[var(--fg-tertiary)]">
          Verifique sua caixa de entrada
        </p>

        <p className="text-[13px] text-[var(--fg-secondary)] mb-1">
          Enviamos o link de recuperação para{' '}
          <span className="font-medium text-[var(--fg-primary)]">{sentTo}</span>. Clique no link
          para redefinir sua senha.
        </p>
        <p className="text-[12px] text-[var(--fg-tertiary)] mb-6">
          Não encontrou? Verifique a pasta de spam.
        </p>

        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--fg-tertiary)] underline-offset-4 hover:text-[var(--fg-secondary)] hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Voltar para login
        </Link>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout>
      <AuthBrandHeader />

      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[var(--fg-primary)]">Recuperar senha</h1>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Informe seu email para receber o link de recuperação
        </p>
      </div>

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
            {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
          </Button>
        </form>
      </Form>

      <div className="mt-6">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--fg-tertiary)] underline-offset-4 hover:text-[var(--fg-secondary)] hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Voltar para login
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
