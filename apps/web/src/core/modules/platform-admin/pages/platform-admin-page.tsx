"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from "src/core/shared/components/ui/card";
import { Button } from "src/core/shared/components/ui/button";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import {
  PLATFORM_ADMIN_NAV_ITEMS,
  PlatformAdminStatCard,
  formatPlatformMoney,
} from "../components/platform-admin-primitives";
import {
  useAIModels,
  useAIProviderPolicies,
  useAIProviders,
} from "../hooks/use-ai-catalog";
import { usePlatformAdmins } from "../hooks/use-platform-admin";
import { usePlatformCosts, usePlatformRuns } from "../hooks/use-platform-runs";

export function PlatformAdminPage() {
  const admins = usePlatformAdmins();
  const providers = useAIProviders();
  const models = useAIModels();
  const policies = useAIProviderPolicies();
  const runs = usePlatformRuns();
  const costs = usePlatformCosts();

  const adminAssignments = admins.data ?? [];
  const providerRows = providers.data ?? [];
  const modelRows = models.data ?? [];
  const policyRows = policies.data ?? [];
  const runRows = runs.data ?? [];

  const activeProviders = providerRows.filter(
    (item) => item.status === "active",
  ).length;
  const activeModels = modelRows.filter(
    (item) => item.status === "active",
  ).length;
  const runningRuns = runRows.filter(
    (item) => item.status === "queued" || item.status === "running",
  ).length;

  return (
    <PageLayout
      eyebrow="Conta"
      title="Admin de plataforma"
      description="Monitore a saude da camada global de IA, ajuste catalogos e mantenha governanca centralizada antes que isso impacte os workspaces das empresas."
      actions={
        <Button asChild>
          <Link href="/workspaces/admin/runs">Ver execucoes</Link>
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PlatformAdminStatCard
          label="Acessos globais"
          value={String(adminAssignments.length)}
          hint="Usuarios com controle sobre a camada administrativa da plataforma."
          icon={PLATFORM_ADMIN_NAV_ITEMS[1].icon}
        />
        <PlatformAdminStatCard
          label="Providers ativos"
          value={`${activeProviders}/${providerRows.length}`}
          hint="Gateways ou vendors prontos para operacao no runtime global."
          icon={PLATFORM_ADMIN_NAV_ITEMS[2].icon}
        />
        <PlatformAdminStatCard
          label="Modelos ativos"
          value={`${activeModels}/${modelRows.length}`}
          hint="Catalogo efetivamente disponivel para agentes e execucoes."
          icon={PLATFORM_ADMIN_NAV_ITEMS[3].icon}
        />
        <PlatformAdminStatCard
          label="Custo tecnico"
          value={formatPlatformMoney(costs.data?.totalCost)}
          hint="Soma acumulada das execucoes registradas pela plataforma."
          icon={PLATFORM_ADMIN_NAV_ITEMS[7].icon}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="bg-[var(--bg-base)]">
          <CardHeader className="border-b border-[var(--line-subtle)] pb-5">
            <CardTitle className="text-[18px]">Frentes de operacao</CardTitle>
            <CardDescription>
              Cada frente abaixo leva para uma area reescrita com foco em
              leitura rapida, acao direta e contexto operacional.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5 md:grid-cols-2">
            {PLATFORM_ADMIN_NAV_ITEMS.filter(
              (item) => item.href !== "/workspaces/admin",
            ).map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] px-4 py-4 transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--bg-hover)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-[12px] leading-[1.55] text-[var(--fg-tertiary)]">
                        {item.description}
                      </p>
                    </div>
                    <div className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-2">
                      <Icon className="size-4 text-[var(--fg-secondary)]" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-base)]">
          <CardHeader className="border-b border-[var(--line-subtle)] pb-5">
            <CardTitle className="text-[18px]">Sinais prioritarios</CardTitle>
            <CardDescription>
              Resumo do que merece atencao imediata na camada central de IA.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5">
            <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] px-4 py-4">
              <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                Politicas por empresa
              </p>
              <p className="mt-2 text-[22px] font-medium tracking-[-0.03em] text-[var(--fg-primary)]">
                {policyRows.length}
              </p>
              <p className="mt-1 text-[12px] leading-[1.55] text-[var(--fg-tertiary)]">
                Empresas com regra explicita de provider/modelo em vez de
                fallback global.
              </p>
            </div>
            <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] px-4 py-4">
              <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                Runs em andamento
              </p>
              <p className="mt-2 text-[22px] font-medium tracking-[-0.03em] text-[var(--fg-primary)]">
                {runningRuns}
              </p>
              <p className="mt-1 text-[12px] leading-[1.55] text-[var(--fg-tertiary)]">
                Execucoes que ainda podem gerar custo, erro operacional ou
                backlog.
              </p>
            </div>
            <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] px-4 py-4">
              <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                Catalogo total
              </p>
              <p className="mt-2 text-[22px] font-medium tracking-[-0.03em] text-[var(--fg-primary)]">
                {providerRows.length + modelRows.length}
              </p>
              <p className="mt-1 text-[12px] leading-[1.55] text-[var(--fg-tertiary)]">
                Soma de providers e modelos mantidos pela plataforma para os
                agentes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          {
            title: "Governanca de acesso",
            description:
              "Revise platform_owner e platform_admin antes de abrir novas operacoes ou alterar catalogos globais.",
            href: "/workspaces/admin/admins",
          },
          {
            title: "Catalogo de runtime",
            description:
              "Mantenha providers e modelos coerentes com o que os agentes conseguem executar e custear.",
            href: "/workspaces/admin/providers",
          },
          {
            title: "Controle por empresa",
            description:
              "Use policies para restringir exposicao de modelos e garantir governanca de BYOK por organization.",
            href: "/workspaces/admin/policies",
          },
        ].map((item) => (
          <Card
            key={item.title}
            className="border-[var(--line-default)] bg-[var(--bg-base)]"
          >
            <CardHeader className="p-6 pb-3">
              <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0 text-[13px] text-[var(--fg-tertiary)]">
              <p>{item.description}</p>
              <Button className="mt-4" variant="outline" asChild>
                <Link href={item.href}>Abrir area</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
