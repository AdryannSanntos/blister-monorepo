"use client";

import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback } from "src/core/shared/components/ui/avatar";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import { EmptyState } from "src/core/shared/components/ui/empty-state";
import { Separator } from "src/core/shared/components/ui/separator";
import { authClient } from "src/core/shared/utils/auth-client";
import { useActiveOrganization } from "../hooks/use-active-organization";
import { useUserOrganizations } from "../hooks/use-organizations";

function OrgCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3 animate-pulse">
      <div className="size-10 rounded-[var(--r-md)] bg-[var(--bg-hover)]" />
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="h-3.5 w-32 rounded bg-[var(--bg-hover)]" />
        <div className="h-3 w-24 rounded bg-[var(--bg-hover)]" />
      </div>
    </div>
  );
}

export function OrgSelectorPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { setActiveOrgId } = useActiveOrganization();

  const { data: organizations, isLoading } = useUserOrganizations(
    session?.user?.id,
  );

  function handleSelectOrg(orgId: string) {
    setActiveOrgId(orgId);
    router.push("/app");
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Selecionar workspace</CardTitle>
        <CardDescription>Escolha qual workspace acessar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <OrgCardSkeleton />
            <OrgCardSkeleton />
            <OrgCardSkeleton />
          </div>
        ) : organizations && organizations.length > 0 ? (
          <ul className="space-y-0">
            {organizations.map((org, index) => {
              const initials = org.name
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase() ?? "")
                .join("");

              return (
                <li key={org.id}>
                  {index > 0 && <Separator className="my-1" />}
                  <button
                    type="button"
                    onClick={() => handleSelectOrg(org.id)}
                    className="flex w-full items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3 text-left transition-colors duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                  >
                    <Avatar shape="square" className="size-10">
                      <AvatarFallback className="text-[13px]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-[var(--fg-primary)]">
                        {org.name}
                      </p>
                      <p className="truncate text-[12px] text-[var(--fg-tertiary)]">
                        app.companyos.com/{org.slug}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={Building2}
            title="Nenhum workspace encontrado"
            description="O workspace organiza equipe, permissões, assets e contexto operacional da empresa. Crie o primeiro para começar."
            action={
              <Button asChild>
                <Link href="/workspace/create">
                  <Plus className="size-4" />
                  Criar workspace
                </Link>
              </Button>
            }
            compact
            className="py-12"
          />
        )}

        {organizations && organizations.length > 0 ? (
          <>
            <Separator />

            <Button variant="outline" className="w-full" asChild>
              <Link href="/workspace/create">
                <Plus className="size-4" />
                Criar novo workspace
              </Link>
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
