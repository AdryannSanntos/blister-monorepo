"use client";

import Link from "next/link";
import { Brain, Users } from "lucide-react";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
} from "src/core/shared/components/ui/card";
import { Display } from "src/core/shared/components/ui/display";
import { Badge } from "src/core/shared/components/ui/badge";
import { useDashboardData } from "src/core/modules/dashboard/hooks/use-dashboard-data";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getFirstName(fullName: string) {
  return fullName.split(" ")[0] ?? fullName;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DashboardPage() {
  const {
    displayName,
    activeOrganization,
    organizations,
    members,
    pendingInvitations,
    onboardingPublished,
    onboardingDraft,
    isLoading,
  } = useDashboardData();

  const firstName = getFirstName(displayName);

  if (isLoading || !activeOrganization) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  const onboardingStep = (onboardingDraft?.currentStep ?? 0) + 1;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Display level="d3" as="h1" className="tracking-[0.02em]">
          {getGreeting()},{" "}
          <span className="font-medium not-italic">{firstName}</span>.
        </Display>
        <p className="text-[14px] text-[var(--fg-tertiary)]">
          Aqui está o resumo do seu workspace hoje.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="px-5 py-5">
            <p className="text-[11.5px] uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Workspace
            </p>
            <p className="mt-2 text-2xl font-medium text-[var(--fg-primary)]">
              {activeOrganization.name}
            </p>
            <p className="mt-1 text-[12.5px] text-[var(--fg-tertiary)]">
              {activeOrganization.slug}
            </p>
          </CardContent>
          <CardFooter className="border-t border-[var(--line-subtle)] px-5 py-3">
            <p className="text-[12px] text-[var(--fg-tertiary)]">
              Criado em {formatDate(activeOrganization.createdAt)}
            </p>
          </CardFooter>
        </Card>

        <Card>
          <CardContent className="px-5 py-5">
            <p className="text-[11.5px] uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Membros
            </p>
            <p className="mt-2 text-2xl font-medium text-[var(--fg-primary)]">
              {members.length}
            </p>
            <p className="mt-1 text-[12.5px] text-[var(--fg-tertiary)]">
              {organizations.length} workspace{organizations.length > 1 ? "s" : ""} no total
            </p>
          </CardContent>
          <CardFooter className="border-t border-[var(--line-subtle)] px-5 py-3">
            <Button variant="ghost" size="sm" className="-ml-2 h-7 text-[12px]" asChild>
              <Link href="/dashboard/invites">
                <Users className="size-3.5" />
                Gerenciar equipe
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardContent className="px-5 py-5">
            <p className="text-[11.5px] uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Convites pendentes
            </p>
            <p className="mt-2 text-2xl font-medium text-[var(--fg-primary)]">
              {pendingInvitations.length}
            </p>
            <p className="mt-1 text-[12.5px] text-[var(--fg-tertiary)]">
              {pendingInvitations.length === 0
                ? "Nenhum aguardando aceite"
                : "Aguardando aceite"}
            </p>
          </CardContent>
          <CardFooter className="border-t border-[var(--line-subtle)] px-5 py-3">
            <Button variant="ghost" size="sm" className="-ml-2 h-7 text-[12px]" asChild>
              <Link href="/dashboard/invites">
                Ver convites
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardContent className="px-5 py-5">
            <p className="text-[11.5px] uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Company Brain
            </p>
            <p className="mt-2 text-2xl font-medium text-[var(--fg-primary)]">
              {onboardingPublished ? "100%" : `${Math.min(onboardingStep * 11, 99)}%`}
            </p>
            <p className="mt-1 text-[12.5px] text-[var(--fg-tertiary)]">
              {onboardingPublished
                ? onboardingDraft?.publishedAt
                  ? `Publicado em ${formatDate(onboardingDraft.publishedAt)}`
                  : "Publicado"
                : `Passo ${onboardingStep} de 9`}
            </p>
          </CardContent>
          <CardFooter className="border-t border-[var(--line-subtle)] px-5 py-3">
            <div className="flex w-full items-center justify-between gap-2">
              <Badge variant={onboardingPublished ? "success" : "secondary"}>
                {onboardingPublished ? "Publicado" : "Em progresso"}
              </Badge>
              <Button variant="ghost" size="sm" className="-mr-2 h-7 text-[12px]" asChild>
                <Link href="/onboarding">
                  <Brain className="size-3.5" />
                  Abrir
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}
