"use client";

import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getInitials } from "src/core/modules/dashboard/hooks/use-dashboard-data";
import { Avatar, AvatarFallback } from "src/core/shared/components/ui/avatar";
import { Button } from "src/core/shared/components/ui/button";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { authClient } from "src/core/shared/utils/auth-client";
import { useActiveOrganization } from "../hooks/use-active-organization";
import { useUserOrganizations } from "../hooks/use-organizations";

function OrgCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-4">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-[var(--r-md)] bg-[var(--bg-hover)]" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-3.5 w-40 rounded bg-[var(--bg-hover)]" />
          <div className="h-3 w-28 rounded bg-[var(--bg-hover)]" />
        </div>
      </div>
    </div>
  );
}

export function WorkspacesPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { setActiveOrgId } = useActiveOrganization();
  const { data: organizations, isLoading } = useUserOrganizations(session?.user?.id);

  function handleSelectOrg(orgId: string) {
    setActiveOrgId(orgId);
    router.push("/dashboard");
  }

  return (
    <PageLayout
      eyebrow="Conta"
      title="Minhas empresas"
      description="Selecione uma empresa para acessar o workspace ou crie uma nova."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/workspace/create">
            <Plus className="size-3.5" />
            Nova empresa
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <OrgCardSkeleton />
          <OrgCardSkeleton />
          <OrgCardSkeleton />
        </div>
      ) : organizations && organizations.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {organizations.map((org) => {
            const initials = getInitials(org.name);
            return (
              <button
                key={org.id}
                type="button"
                onClick={() => handleSelectOrg(org.id)}
                className="group flex items-center gap-4 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-4 text-left transition-colors duration-[var(--dur-fast)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
              >
                <Avatar shape="square" className="size-10">
                  <AvatarFallback className="text-[13px]">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                    {org.name}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-[var(--fg-tertiary)]">
                    {org.slug}
                  </p>
                </div>
                <Building2 className="size-4 shrink-0 text-[var(--fg-quaternary)] transition-colors group-hover:text-[var(--accent)]" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-[var(--r-lg)] border border-dashed border-[var(--line-default)] bg-[var(--bg-sunken)] text-center">
          <Building2 className="size-6 text-[var(--fg-tertiary)]" />
          <div>
            <p className="text-[13px] font-medium text-[var(--fg-primary)]">
              Nenhuma empresa encontrada
            </p>
            <p className="mt-1 text-[12px] text-[var(--fg-tertiary)]">
              Crie sua primeira empresa para começar.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/workspace/create">
              <Plus className="size-3.5" />
              Criar empresa
            </Link>
          </Button>
        </div>
      )}
    </PageLayout>
  );
}
