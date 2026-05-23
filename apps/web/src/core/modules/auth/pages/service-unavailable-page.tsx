"use client";

import { RotateCw, ServerCrash } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AuthBrandHeader } from "src/core/modules/auth/components/auth-brand-header";
import { AuthSplitLayout } from "src/core/modules/auth/components/auth-split-layout";
import { Button } from "src/core/shared/components/ui/button";

function getSafeRetryPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export function ServiceUnavailablePage() {
  const searchParams = useSearchParams();
  const retryPath = getSafeRetryPath(searchParams.get("next"));

  return (
    <AuthSplitLayout>
      <AuthBrandHeader />

      <div className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-default)] bg-[var(--bg-subtle)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
          <span className="size-2 rounded-full bg-[var(--warning)]" />
          Instabilidade temporaria
        </div>

        <div className="rounded-[var(--r-2xl)] border border-[var(--line-default)] bg-[var(--bg-base)] p-6 shadow-[var(--shadow-md)]">
          <div className="mb-5 flex size-14 items-center justify-center rounded-[var(--r-xl)] bg-[var(--bg-raised)] text-[var(--fg-secondary)]">
            <ServerCrash className="size-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-[22px] font-semibold text-[var(--fg-primary)]">
              Nao foi possivel conectar ao servidor
            </h1>
            <p className="text-[14px] leading-6 text-[var(--fg-tertiary)]">
              O Workana AI nao conseguiu validar sua sessao agora. Isso costuma
              acontecer durante uma indisponibilidade temporaria da API. Tente
              novamente em instantes.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="sm:flex-1">
              <Link href={retryPath}>
                <RotateCw className="size-4" />
                Tentar novamente
              </Link>
            </Button>

            <Button asChild variant="outline" className="sm:flex-1">
              <Link href="/auth/login">Ir para login</Link>
            </Button>
          </div>

          <p className="mt-4 text-[12px] text-[var(--fg-quaternary)]">
            Se o erro continuar, verifique se a API interna esta ativa no
            ambiente atual.
          </p>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
