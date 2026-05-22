"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Archive, Bot, ExternalLink, MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CreateAgentDialog } from "src/core/modules/agents/components/create-agent-dialog";
import {
  type Agent,
  type AgentStatus,
  useArchiveAgent,
  useCompanyAgents,
} from "src/core/modules/agents/hooks/use-agents";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { PermissionGate } from "src/core/shared/components/permission-gate";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { ConfirmationDialog } from "src/core/shared/components/ui/confirmation-dialog";
import {
  type ColumnDef,
  DataTable,
  type DataTableFilter,
} from "src/core/shared/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Skeleton } from "src/core/shared/components/ui/skeleton";

function statusLabel(status: AgentStatus) {
  if (status === "active") return "Ativo";
  if (status === "archived") return "Arquivado";
  return "Rascunho";
}

function statusVariant(
  status: AgentStatus,
): "success" | "secondary" | "destructive" {
  if (status === "active") return "success";
  if (status === "archived") return "destructive";
  return "secondary";
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
}

export function AgentsPage() {
  const { activeOrgId } = useActiveOrganization();
  const orgId = activeOrgId ?? "";
  const agents = useCompanyAgents(orgId);
  const archive = useArchiveAgent(orgId);
  const [createOpen, setCreateOpen] = useState(false);
  const [agentToArchive, setAgentToArchive] = useState<Agent | null>(null);

  const columns: ColumnDef<Agent>[] = [
    {
      id: "name",
      accessorKey: "name",
      header: "Nome",
      meta: { label: "Nome" },
      cell: ({ row }) => (
        <Link
          href={`/dashboard/workspace/agents/${row.original.id}/chat`}
          className="flex items-center gap-2 text-[13px] font-medium text-[var(--fg-primary)] hover:text-[var(--accent)]"
        >
          <Bot className="size-4 text-[var(--fg-tertiary)]" />
          {row.original.name}
        </Link>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => row.status,
      header: "Status",
      meta: { label: "Status" },
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.status)}>
          {statusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      id: "category",
      accessorKey: "category",
      header: "Categoria",
      meta: { label: "Categoria" },
      cell: ({ row }) => (
        <span className="text-[12px] text-[var(--fg-secondary)]">
          {row.original.category}
        </span>
      ),
    },
    {
      id: "updatedAt",
      accessorFn: (row) => row.updatedAt,
      header: "Atualizado em",
      meta: { label: "Atualizado em" },
      cell: ({ row }) => (
        <span className="text-[12px] tabular-nums text-[var(--fg-tertiary)]">
          {formatDate(row.original.updatedAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Ações">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link
                  href={`/dashboard/workspace/agents/${row.original.id}/chat`}
                >
                  <ExternalLink className="size-3.5" />
                  Abrir workspace
                </Link>
              </DropdownMenuItem>
              <PermissionGate permission="agent.delete">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-[var(--danger)]"
                  onClick={() => setAgentToArchive(row.original)}
                  disabled={row.original.status === "archived"}
                >
                  <Archive className="size-3.5" />
                  Arquivar
                </DropdownMenuItem>
              </PermissionGate>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const filters: DataTableFilter<Agent>[] = [
    {
      id: "status",
      label: "Status",
      options: [
        {
          label: "Rascunho",
          value: "draft",
          predicate: (a) => a.status === "draft",
        },
        {
          label: "Ativo",
          value: "active",
          predicate: (a) => a.status === "active",
        },
        {
          label: "Arquivado",
          value: "archived",
          predicate: (a) => a.status === "archived",
        },
      ],
    },
  ];

  return (
    <PageLayout
      eyebrow="Workspace"
      title="Agentes"
      description="Seus agentes customizados. Crie, configure e veja todas as execuções da empresa em um só lugar."
      actions={
        <PermissionGate permission="agent.create">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Criar agente
          </Button>
        </PermissionGate>
      }
    >
      {agents.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="ds-shimmer h-10 w-full" />
          <Skeleton className="ds-shimmer h-10 w-full" />
          <Skeleton className="ds-shimmer h-10 w-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={agents.data ?? []}
          filters={filters}
          emptyState={{
            icon: Bot,
            title: "Nenhum agente ainda",
            description:
              "Crie o primeiro agente para começar a automatizar tarefas com IA na sua empresa.",
            action: (
              <PermissionGate permission="agent.create">
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  Criar agente
                </Button>
              </PermissionGate>
            ),
          }}
        />
      )}

      {activeOrgId && (
        <CreateAgentDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          orgId={activeOrgId}
        />
      )}

      <ConfirmationDialog
        open={Boolean(agentToArchive)}
        onOpenChange={(open) => !open && setAgentToArchive(null)}
        title="Arquivar agente"
        description={
          <>
            O agente <strong>{agentToArchive?.name}</strong> será arquivado e
            não poderá receber novas execuções. Você poderá restaurá-lo depois.
          </>
        }
        confirmLabel={archive.isPending ? "Arquivando..." : "Arquivar"}
        pending={archive.isPending}
        destructive
        onConfirm={async () => {
          if (!agentToArchive) return;
          await archive.mutateAsync(agentToArchive.id);
          setAgentToArchive(null);
        }}
      />
    </PageLayout>
  );
}
