'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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
import { PasswordInput } from 'src/core/shared/components/ui/password-input';
import { PasswordStrength } from 'src/core/shared/components/ui/password-strength';
import { authClient } from 'src/core/shared/utils/auth-client';
import { z } from 'zod';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Senha deve ter pelo menos 8 caracteres')
      .regex(/[A-Z]/, 'Inclua pelo menos uma letra maiúscula')
      .regex(/[0-9]/, 'Inclua pelo menos um número')
      .regex(/[^A-Za-z0-9]/, 'Inclua pelo menos um caractere especial'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const passwordValue = form.watch('newPassword');

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) {
      toast.error('Token de redefinição inválido ou expirado.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await authClient.resetPassword({ newPassword: values.newPassword, token });

      if (error) {
        toast.error(error.message ?? 'Erro ao redefinir senha. Tente novamente.');
        return;
      }

      toast.success('Senha redefinida com sucesso!');
      router.push('/auth/login');
    } catch {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthSplitLayout>
        <AuthBrandHeader />

        <div className="mb-8">
          <h1 className="text-[22px] font-semibold text-[var(--fg-primary)]">Link inválido</h1>
          <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
            Este link de redefinição é inválido ou expirou
          </p>
        </div>

        <p className="text-[13px] text-[var(--fg-secondary)] mb-6">
          Por favor, solicite um novo link de recuperação de senha.
        </p>

        <Button asChild className="w-full">
          <Link href="/auth/forgot-password">Solicitar novo link</Link>
        </Button>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout>
      <AuthBrandHeader />

      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[var(--fg-primary)]">Criar nova senha</h1>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Defina uma nova senha para sua conta
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nova senha</FormLabel>
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
                <FormLabel>Confirmar nova senha</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar nova senha'}
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
