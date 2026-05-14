"use client";

import Link from "next/link";
import { Brain, Building2, Mail, ShieldCheck, Users } from "lucide-react";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import {
  getInitials,
  useDashboardData,
} from "src/core/modules/dashboard/hooks/use-dashboard-data";
import { Avatar, AvatarFallback } from "src/core/shared/components/ui/avatar";

function formatRole(value: string | null) {
  if (!value) {
    return "member";
  }

  return value.replace(/[-_]/g, " ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--fg-tertiary)]">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const {
    sessionUser,
    displayName,
    activeOrganization,
    activeRole,
    organizations,
    members,
    pendingInvitations,
    onboardingDraft,
    onboardingPublished,
    isLoading,
  } = useDashboardData();

  if (isLoading || !activeOrganization) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  const userInitials = getInitials(displayName);
  const onboardingStep = (onboardingDraft?.currentStep ?? 0) + 1;
  const onboardingSummary = onboardingPublished
    ? onboardingDraft?.publishedAt
      ? `Publicado em ${formatDate(onboardingDraft.publishedAt)}`
      : "Publicado"
    : `Configuração em andamento · passo ${onboardingStep} de 9`;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={onboardingPublished ? "success" : "secondary"}>
                {onboardingPublished ? "Company Brain publicado" : "Onboarding em andamento"}
              </Badge>
              <Badge variant="outline">{formatRole(activeRole)}</Badge>
            </div>
            <div>
              <CardTitle className="text-3xl tracking-[-0.02em]">
                Olá, {displayName}.
              </CardTitle>
              <CardDescription className="mt-2 text-base text-[var(--fg-tertiary)]">
                Você está no workspace <strong>{activeOrganization.name}</strong> e o sistema já está usando os dados reais da sua sessão, do workspace ativo e do status do Company Brain.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                Workspace ativo
              </p>
              <p className="mt-2 text-lg font-medium text-[var(--fg-primary)]">
                {activeOrganization.name}
              </p>
              <p className="mt-1 text-sm text-[var(--fg-tertiary)]">
                {activeOrganization.slug}
              </p>
            </div>
            <div className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                Seu acesso
              </p>
              <p className="mt-2 text-lg font-medium text-[var(--fg-primary)]">
                {formatRole(activeRole)}
              </p>
              <p className="mt-1 text-sm text-[var(--fg-tertiary)]">
                {sessionUser?.email ?? "Sem email disponível"}
              </p>
            </div>
            <div className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                Company Brain
              </p>
              <p className="mt-2 text-lg font-medium text-[var(--fg-primary)]">
                {onboardingPublished ? "Publicado" : "Em progresso"}
              </p>
              <p className="mt-1 text-sm text-[var(--fg-tertiary)]">
                {onboardingSummary}
              </p>
            </div>
          </CardContent>
          <CardFooter className="gap-2 border-t border-[var(--line-subtle)] px-6 py-4">
            <Button asChild>
              <Link href="/onboarding">
                <Brain />
                Abrir Company Brain
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/invites">
                <Users />
                Gerenciar equipe
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Conta logada</CardDescription>
            <CardTitle>Resumo do usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3">
              <Avatar className="size-12">
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--fg-primary)]">
                  {displayName}
                </p>
                <p className="truncate text-sm text-[var(--fg-tertiary)]">
                  {sessionUser?.email ?? "Sem email disponível"}
                </p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-[var(--fg-secondary)]">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 text-[var(--accent)]" />
                <span>Permissão atual: {formatRole(activeRole)}</span>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="mt-0.5 size-4 text-[var(--accent)]" />
                <span>{organizations.length} workspace(s) vinculado(s) ao seu usuário</span>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 size-4 text-[var(--accent)]" />
                <span>ID da sessão vinculada ao email autenticado</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Workspaces"
          value={String(organizations.length)}
          hint="Quantidade de workspaces disponíveis para este usuário"
        />
        <StatCard
          label="Membros"
          value={String(members.length)}
          hint="Pessoas atualmente vinculadas ao workspace ativo"
        />
        <StatCard
          label="Convites pendentes"
          value={String(pendingInvitations.length)}
          hint="Convites aguardando aceite ou expiração"
        />
        <StatCard
          label="Company Brain"
          value={onboardingPublished ? "100%" : `${Math.min(onboardingStep * 11, 99)}%`}
          hint={onboardingPublished ? "Configuração publicada" : `Passo atual ${onboardingStep} de 9`}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Workspace</CardDescription>
            <CardTitle>Visão geral do ambiente ativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--fg-secondary)]">
            <div className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] px-4 py-3">
              <span>Nome</span>
              <strong className="font-medium text-[var(--fg-primary)]">
                {activeOrganization.name}
              </strong>
            </div>
            <div className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] px-4 py-3">
              <span>Slug</span>
              <strong className="font-medium text-[var(--fg-primary)]">
                {activeOrganization.slug}
              </strong>
            </div>
            <div className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] px-4 py-3">
              <span>Criado em</span>
              <strong className="font-medium text-[var(--fg-primary)]">
                {formatDate(activeOrganization.createdAt)}
              </strong>
            </div>
            <div className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] px-4 py-3">
              <span>Seu papel</span>
              <strong className="font-medium text-[var(--fg-primary)]">
                {formatRole(activeRole)}
              </strong>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Company Brain</CardDescription>
            <CardTitle>Status do conhecimento da empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
              <p className="text-sm font-medium text-[var(--fg-primary)]">
                {onboardingPublished ? "Publicado e pronto para uso" : "Ainda precisa ser concluído"}
              </p>
              <p className="mt-1 text-sm text-[var(--fg-tertiary)]">
                {onboardingSummary}
              </p>
            </div>
            <div className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
              <p className="text-sm font-medium text-[var(--fg-primary)]">
                Próxima ação recomendada
              </p>
              <p className="mt-1 text-sm text-[var(--fg-tertiary)]">
                {onboardingPublished
                  ? "Revise e mantenha o Company Brain atualizado conforme o workspace evolui."
                  : "Finalize o onboarding para liberar o uso completo dos módulos de inteligência."}
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t border-[var(--line-subtle)] px-6 py-4">
            <Button asChild>
              <Link href="/onboarding">
                <Brain />
                {onboardingPublished ? "Revisar Company Brain" : "Continuar onboarding"}
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Equipe</CardDescription>
            <CardTitle>Membros do workspace</CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-[var(--fg-tertiary)]">
                Nenhum membro encontrado para este workspace.
              </p>
            ) : (
              <ul className="space-y-3">
                {members.slice(0, 5).map((member) => {
                  const memberName = member.user.name?.trim() || member.user.email;
                  const memberRole = member.roles[0]?.role.name ?? "member";

                  return (
                    <li
                      key={member.id}
                      className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3"
                    >
                      <Avatar className="size-10">
                        <AvatarFallback>{getInitials(memberName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--fg-primary)]">
                          {memberName}
                        </p>
                        <p className="truncate text-sm text-[var(--fg-tertiary)]">
                          {member.user.email}
                        </p>
                      </div>
                      <Badge variant="outline">{formatRole(memberRole)}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
          <CardFooter className="border-t border-[var(--line-subtle)] px-6 py-4">
            <Button variant="outline" asChild>
              <Link href="/dashboard/invites">
                <Users />
                Abrir gestão da equipe
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Convites</CardDescription>
            <CardTitle>Convites pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingInvitations.length === 0 ? (
              <p className="text-sm text-[var(--fg-tertiary)]">
                Não há convites pendentes no momento.
              </p>
            ) : (
              <ul className="space-y-3">
                {pendingInvitations.slice(0, 5).map((invitation) => (
                  <li
                    key={invitation.id}
                    className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--fg-primary)]">
                          {invitation.email}
                        </p>
                        <p className="text-sm text-[var(--fg-tertiary)]">
                          Expira em {formatDate(invitation.expiresAt)}
                        </p>
                      </div>
                      <Badge variant="secondary">Pendente</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          <CardFooter className="border-t border-[var(--line-subtle)] px-6 py-4">
            <Button variant="outline" asChild>
              <Link href="/dashboard/invites">
                <Mail />
                Gerenciar convites
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}
