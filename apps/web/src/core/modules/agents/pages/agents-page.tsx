"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bot, Edit2, Eye, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "src/core/shared/components/ui/sheet";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { z } from "zod";
import {
  type CompanyAgent,
  useArchiveCompanyAgent,
  useCompanyAgent,
  useCompanyAgents,
  useCreateCompanyAgent,
  usePublishAgentVersion,
  useUpdateCompanyAgent,
} from "../hooks/use-agents";

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" | "success" | "warning" {
  if (status === "active") return "success";
  if (status === "archived") return "destructive";
  if (status === "published") return "default";
  return "secondary";
}

const createSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minúsculas, números e hífens",
    ),
  description: z.string().max(500).optional(),
});

const editSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minúsculas, números e hífens",
    ),
  description: z.string().max(500).optional(),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

export function AgentsPage() {
  const { activeOrgId } = useActiveOrganization();
  const agents = useCompanyAgents(activeOrgId);
  const createAgent = useCreateCompanyAgent(activeOrgId);
  const archiveAgent = useArchiveCompanyAgent(activeOrgId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<CompanyAgent | null>(null);
  const [detailAgentId, setDetailAgentId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<CompanyAgent | null>(null);

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    mode: "onBlur",
    defaultValues: { name: "", slug: "", description: "" },
  });

  async function onCreateSubmit(values: CreateValues) {
    await createAgent.mutateAsync({
      ...values,
      category: "custom",
      flowDefinition: { nodes: [], edges: [] },
      inputSchema: {},
      outputSchema: {},
    });
    setCreateOpen(false);
    createForm.reset();
  }

  if (!activeOrgId) return null;

  const filters: DataTableFilter<CompanyAgent>[] = [
    {
      id: "type",
      label: "Tipo",
      options: [
        {
          label: "Sistema",
          value: "system",
          predicate: (row) => Boolean(row.templateId),
        },
        {
          label: "Customizado",
          value: "custom",
          predicate: (row) => !row.templateId,
        },
      ],
    },
    {
      id: "status",
      label: "Status",
      options: [
        {
          label: "Ativo",
          value: "active",
          predicate: (row) => row.status === "active",
        },
        {
          label: "Draft",
          value: "draft",
          predicate: (row) => row.status === "draft",
        },
        {
          label: "Arquivado",
          value: "archived",
          predicate: (row) => row.status === "archived",
        },
      ],
    },
  ];

  const columns: ColumnDef<CompanyAgent>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      meta: { label: "Nome" },
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
            {row.original.name}
          </p>
          <p className="truncate font-mono text-[12px] text-[var(--fg-tertiary)]">
            {row.original.slug}
          </p>
        </div>
      ),
    },
    {
      id: "type",
      header: "Tipo",
      meta: { label: "Tipo" },
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.templateId ? "Sistema" : "Customizado"}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      meta: { label: "Status" },
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "activeVersion",
      header: "Versão ativa",
      meta: { label: "Versão ativa" },
      cell: ({ row }) => {
        const version = row.original.versions?.[0];
        if (!version)
          return <span className="text-[var(--fg-quaternary)]">—</span>;
        return (
          <span className="font-mono text-[12px] tabular-nums text-[var(--fg-secondary)]">
            v{version.versionNumber} · {version.status}
          </span>
        );
      },
    },
    {
      accessorKey: "updatedAt",
      header: "Atualizado em",
      meta: { label: "Atualizado em" },
      cell: ({ row }) => (
        <span className="font-mono text-[12px] tabular-nums text-[var(--fg-tertiary)]">
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
              <Button variant="ghost" size="sm">
                Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setDetailAgentId(row.original.id)}
              >
                <Eye className="size-4" />
                Ver detalhes
              </DropdownMenuItem>
              <PermissionGate permission="agent.update">
                <DropdownMenuItem
                  onClick={() => setEditAgent(row.original)}
                >
                  <Edit2 className="size-4" />
                  Editar
                </DropdownMenuItem>
              </PermissionGate>
              {row.original.status !== "archived" && (
                <PermissionGate permission="agent.delete">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-[var(--danger)]"
                    onClick={() => setArchiveTarget(row.original)}
                  >
                    <Trash2 className="size-4" />
                    Arquivar
                  </DropdownMenuItem>
                </PermissionGate>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageLayout
        eyebrow="Workspace"
        title="Agentes"
        description="Catálogo de agentes versionados da company, com status, versão ativa e prontidão para execução."
        actions={
          <PermissionGate permission="agent.create">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Novo agente
            </Button>
          </PermissionGate>
        }
      >
        <DataTable
          columns={columns}
          data={agents.data ?? []}
          getRowId={(agent) => agent.id}
          filters={filters}
          exportOptions={{
            fileName: "agentes",
            title: "Catálogo de agentes",
            columns: [
              { id: "name", label: "Nome", value: (row) => row.name },
              {
                id: "type",
                label: "Tipo",
                value: (row) =>
                  row.templateId ? "Sistema" : "Customizado",
              },
              {
                id: "status",
                label: "Status",
                value: (row) => row.status,
              },
              {
                id: "updatedAt",
                label: "Atualizado em",
                value: (row) => formatDate(row.updatedAt),
              },
            ],
          }}
          bulkActions={[
            {
              id: "archive",
              label: "Arquivar",
              icon: Trash2,
              variant: "destructive",
              permission: "agent.delete",
              onClick: async (rows) => {
                await Promise.all(
                  rows
                    .filter((r) => r.status !== "archived")
                    .map((r) => archiveAgent.mutateAsync(r.id)),
                );
              },
            },
          ]}
          emptyState={{
            icon: Bot,
            title: "Nenhum agente cadastrado",
            description:
              "Crie o primeiro agente da empresa para iniciar a camada operacional de IA.",
            action: (
              <PermissionGate permission="agent.create">
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  Novo agente
                </Button>
              </PermissionGate>
            ),
          }}
        />
      </PageLayout>

      {/* Dialog: criar agente */}
      <CreateAgentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        form={createForm}
        onSubmit={onCreateSubmit}
        isPending={createAgent.isPending}
      />

      {/* Dialog: editar agente */}
      <EditAgentDialog
        agent={editAgent}
        orgId={activeOrgId}
        onClose={() => setEditAgent(null)}
      />

      {/* Sheet: detalhes do agente */}
      <AgentDetailSheet
        orgId={activeOrgId}
        agentId={detailAgentId}
        onClose={() => setDetailAgentId(null)}
        onEdit={(agent) => {
          setDetailAgentId(null);
          setEditAgent(agent);
        }}
        onArchive={(agent) => {
          setDetailAgentId(null);
          setArchiveTarget(agent);
        }}
      />

      {/* Confirmation: arquivar agente */}
      <ConfirmationDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Arquivar agente"
        description={
          <>
            O agente <strong>{archiveTarget?.name}</strong> será arquivado e não
            poderá mais ser executado. Essa ação pode ser revertida
            posteriormente.
          </>
        }
        confirmLabel="Arquivar agente"
        pending={archiveAgent.isPending}
        destructive
        onConfirm={async () => {
          if (!archiveTarget) return;
          await archiveAgent.mutateAsync(archiveTarget.id);
          setArchiveTarget(null);
        }}
      />
    </>
  );
}

function CreateAgentDialog({
  open,
  onOpenChange,
  form,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ReturnType<typeof useForm<CreateValues>>;
  onSubmit: (values: CreateValues) => Promise<void>;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Novo agente</DialogTitle>
          <DialogDescription>
            Cria um agente customizado com draft inicial dentro da company
            ativa.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Nome</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex.: Agente de análise"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Slug</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex.: analysis-default"
                    />
                  </FormControl>
                  <FormDescription>
                    Identificador único em kebab-case.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={3}
                      placeholder="Descreva o objetivo e contexto de uso deste agente."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Criando..." : "Criar agente"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditAgentDialog({
  agent,
  orgId,
  onClose,
}: {
  agent: CompanyAgent | null;
  orgId: string;
  onClose: () => void;
}) {
  const updateAgent = useUpdateCompanyAgent(orgId, agent?.id ?? null);
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    mode: "onBlur",
    values: agent
      ? { name: agent.name, slug: agent.slug, description: agent.description ?? "" }
      : { name: "", slug: "", description: "" },
  });

  async function onSubmit(values: EditValues) {
    await updateAgent.mutateAsync(values);
    onClose();
  }

  return (
    <Dialog open={Boolean(agent)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Editar agente</DialogTitle>
          <DialogDescription>
            Atualize as informações básicas do agente{" "}
            <strong>{agent?.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    Identificador único em kebab-case.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateAgent.isPending}>
                {updateAgent.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AgentDetailSheet({
  orgId,
  agentId,
  onClose,
  onEdit,
  onArchive,
}: {
  orgId: string;
  agentId: string | null;
  onClose: () => void;
  onEdit: (agent: CompanyAgent) => void;
  onArchive: (agent: CompanyAgent) => void;
}) {
  const agent = useCompanyAgent(orgId, agentId);
  const publishVersion = usePublishAgentVersion(orgId, agentId);
  const currentAgent = agent.data;

  return (
    <Sheet
      open={Boolean(agentId)}
      onOpenChange={(open) => !open && onClose()}
    >
      <SheetContent
        side="right"
        className="w-full max-w-[620px] bg-[var(--bg-base)] p-0"
      >
        <SheetHeader className="gap-2 border-b border-[var(--line-subtle)] p-6">
          <SheetTitle className="text-[18px] font-medium text-[var(--fg-primary)]">
            {currentAgent?.name ?? "Carregando..."}
          </SheetTitle>
          <SheetDescription className="text-[13px] text-[var(--fg-tertiary)]">
            Detalhes, versões e configurações do agente.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {!currentAgent ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              <section className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                  Informações gerais
                </p>
                <div className="mt-3 space-y-2 text-[13px] text-[var(--fg-secondary)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--fg-tertiary)]">Nome</span>
                    <span className="font-medium text-[var(--fg-primary)]">
                      {currentAgent.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--fg-tertiary)]">Slug</span>
                    <span className="font-mono text-[12px]">
                      {currentAgent.slug}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--fg-tertiary)]">Tipo</span>
                    <Badge variant="outline">
                      {currentAgent.templateId ? "Sistema" : "Customizado"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--fg-tertiary)]">Status</span>
                    <Badge variant={statusVariant(currentAgent.status)}>
                      {currentAgent.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--fg-tertiary)]">Criado em</span>
                    <span className="font-mono text-[12px] tabular-nums">
                      {formatDate(currentAgent.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--fg-tertiary)]">
                      Atualizado em
                    </span>
                    <span className="font-mono text-[12px] tabular-nums">
                      {formatDate(currentAgent.updatedAt)}
                    </span>
                  </div>
                  {currentAgent.description && (
                    <div className="pt-2">
                      <span className="text-[var(--fg-tertiary)]">
                        Descrição
                      </span>
                      <p className="mt-1 text-[13px] text-[var(--fg-primary)]">
                        {currentAgent.description}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                  Versões
                </p>
                {(currentAgent.versions ?? []).length > 0 ? (
                  <div className="space-y-2">
                    {(currentAgent.versions ?? []).map((version) => (
                      <div
                        key={version.id}
                        className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-sunken)] px-3 py-3"
                      >
                        <div>
                          <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                            v{version.versionNumber}
                          </p>
                          <p className="text-[12px] text-[var(--fg-tertiary)]">
                            {formatDate(version.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusVariant(version.status)}>
                            {version.status}
                          </Badge>
                          {version.status === "draft" && (
                            <PermissionGate permission="agent.publish">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={publishVersion.isPending}
                                onClick={() =>
                                  publishVersion.mutate(version.id)
                                }
                              >
                                Publicar
                              </Button>
                            </PermissionGate>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-[var(--fg-tertiary)]">
                    Nenhuma versão registrada.
                  </p>
                )}
              </section>

              <div className="flex items-center justify-between gap-3 pt-2">
                <PermissionGate permission="agent.delete">
                  {currentAgent.status !== "archived" && (
                    <Button
                      variant="outline"
                      className="text-[var(--danger)] hover:bg-[color-mix(in_oklch,var(--danger)_10%,transparent)]"
                      onClick={() => onArchive(currentAgent)}
                    >
                      <Trash2 className="size-4" />
                      Arquivar
                    </Button>
                  )}
                </PermissionGate>
                <PermissionGate permission="agent.update">
                  <Button onClick={() => onEdit(currentAgent)}>
                    <Edit2 className="size-4" />
                    Editar agente
                  </Button>
                </PermissionGate>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
