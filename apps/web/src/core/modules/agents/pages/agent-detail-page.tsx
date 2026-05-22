"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Edit2,
  Loader2,
  Rocket,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { PermissionGate } from "src/core/shared/components/permission-gate";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { ConfirmationDialog } from "src/core/shared/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
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
import { Textarea } from "src/core/shared/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "src/core/shared/components/ui/tabs";
import { z } from "zod";
import { FlowCanvas } from "../components/flow-builder/flow-canvas";
import type { AgentFlowDefinition } from "../schemas/agent-flow-schema";
import {
  useArchiveCompanyAgent,
  useCompanyAgent,
  usePublishAgentVersion,
  useSaveAgentDraft,
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
): "default" | "secondary" | "success" | "destructive" {
  if (status === "active") return "success";
  if (status === "archived") return "destructive";
  if (status === "published") return "default";
  return "secondary";
}

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

type EditValues = z.infer<typeof editSchema>;

const DEFAULT_FLOW: AgentFlowDefinition = {
  nodes: [
    { id: "input_1", type: "input", config: { _x: 250, _y: 80 } },
    { id: "output_1", type: "output", config: { _x: 250, _y: 400 } },
  ],
  edges: [],
};

export function AgentDetailPage({ agentId }: { agentId: string }) {
  const { activeOrgId } = useActiveOrganization();
  const agent = useCompanyAgent(activeOrgId, agentId);
  const saveDraft = useSaveAgentDraft(activeOrgId, agentId);
  const publishVersion = usePublishAgentVersion(activeOrgId, agentId);
  const archiveAgent = useArchiveCompanyAgent(activeOrgId);
  const updateAgent = useUpdateCompanyAgent(activeOrgId, agentId);

  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const flowRef = useRef<AgentFlowDefinition | null>(null);

  const currentAgent = agent.data;
  const draftVersion = currentAgent?.versions?.find(
    (v) => v.status === "draft",
  );
  const publishedVersion = currentAgent?.versions?.find(
    (v) => v.status === "published",
  );

  const currentFlow: AgentFlowDefinition =
    draftVersion?.flowDefinition ?? publishedVersion?.flowDefinition ?? DEFAULT_FLOW;

  const handleFlowChange = useCallback((flow: AgentFlowDefinition) => {
    flowRef.current = flow;
    setHasChanges(true);
  }, []);

  async function handleSaveDraft() {
    if (!flowRef.current) return;
    await saveDraft.mutateAsync({
      flowDefinition: flowRef.current as unknown as Record<string, unknown>,
      inputSchema: draftVersion?.inputSchema ?? {},
      outputSchema: draftVersion?.outputSchema ?? {},
    });
    setHasChanges(false);
  }

  async function handlePublish() {
    if (hasChanges && flowRef.current) {
      await saveDraft.mutateAsync({
        flowDefinition: flowRef.current as unknown as Record<string, unknown>,
        inputSchema: draftVersion?.inputSchema ?? {},
        outputSchema: draftVersion?.outputSchema ?? {},
      });
    }
    const versionToPublish = draftVersion ?? publishedVersion;
    if (versionToPublish) {
      await publishVersion.mutateAsync(versionToPublish.id);
    }
    setHasChanges(false);
  }

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    mode: "onBlur",
    values: currentAgent
      ? {
          name: currentAgent.name,
          slug: currentAgent.slug,
          description: currentAgent.description ?? "",
        }
      : { name: "", slug: "", description: "" },
  });

  async function onEditSubmit(values: EditValues) {
    await updateAgent.mutateAsync(values);
    setEditOpen(false);
  }

  if (!activeOrgId) return null;

  if (agent.isLoading) {
    return (
      <div className="flex h-[calc(100svh-80px)] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[var(--fg-tertiary)]" />
      </div>
    );
  }

  if (!currentAgent) {
    return (
      <div className="flex h-[calc(100svh-80px)] flex-col items-center justify-center gap-3">
        <p className="text-[13px] text-[var(--fg-tertiary)]">
          Agente não encontrado.
        </p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/workspace/agents">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100svh-80px)] flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--line-subtle)] px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/dashboard/workspace/agents">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[15px] font-medium text-[var(--fg-primary)]">
                {currentAgent.name}
              </h1>
              <Badge variant={statusVariant(currentAgent.status)}>
                {currentAgent.status}
              </Badge>
              {draftVersion && (
                <Badge variant="secondary">
                  v{draftVersion.versionNumber} draft
                </Badge>
              )}
            </div>
            <p className="truncate font-mono text-[12px] text-[var(--fg-tertiary)]">
              {currentAgent.slug}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PermissionGate permission="agent.update">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Edit2 className="size-3.5" />
              Editar
            </Button>
          </PermissionGate>

          {currentAgent.status !== "archived" && (
            <PermissionGate permission="agent.delete">
              <Button
                variant="outline"
                size="sm"
                className="text-[var(--danger)]"
                onClick={() => setArchiveOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Arquivar
              </Button>
            </PermissionGate>
          )}

          <PermissionGate permission="agent.update">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasChanges || saveDraft.isPending}
              onClick={handleSaveDraft}
            >
              {saveDraft.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              Salvar draft
            </Button>
          </PermissionGate>

          <PermissionGate permission="agent.publish">
            <Button
              size="sm"
              disabled={publishVersion.isPending || saveDraft.isPending}
              onClick={handlePublish}
            >
              {publishVersion.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Rocket className="size-3.5" />
              )}
              Publicar
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="flow" className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-[var(--line-subtle)] px-6">
          <TabsList variant="underline">
            <TabsTrigger value="flow">Fluxo</TabsTrigger>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="versions">
              Versões ({currentAgent.versions?.length ?? 0})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="flow" className="m-0 min-h-0 flex-1">
          <FlowCanvas
            key={draftVersion?.id ?? currentAgent.id}
            initialFlow={currentFlow}
            onChange={handleFlowChange}
            readOnly={currentAgent.status === "archived"}
          />
        </TabsContent>

        <TabsContent value="info" className="m-0 flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl space-y-6">
            <section className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                Informações gerais
              </p>
              <div className="mt-4 space-y-3 text-[13px] text-[var(--fg-secondary)]">
                <Row label="Nome" value={currentAgent.name} />
                <Row label="Slug" value={currentAgent.slug} mono />
                <Row
                  label="Tipo"
                  value={
                    currentAgent.templateId ? "Sistema" : "Customizado"
                  }
                />
                <Row label="Status" value={currentAgent.status} />
                <Row
                  label="Criado em"
                  value={formatDate(currentAgent.createdAt)}
                  mono
                />
                <Row
                  label="Atualizado em"
                  value={formatDate(currentAgent.updatedAt)}
                  mono
                />
                {currentAgent.description && (
                  <div className="pt-2">
                    <p className="text-[var(--fg-tertiary)]">Descrição</p>
                    <p className="mt-1 text-[var(--fg-primary)]">
                      {currentAgent.description}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent
          value="versions"
          className="m-0 flex-1 overflow-y-auto p-6"
        >
          <div className="mx-auto max-w-2xl space-y-3">
            {(currentAgent.versions ?? []).length > 0 ? (
              (currentAgent.versions ?? []).map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] px-5 py-4"
                >
                  <div>
                    <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                      v{version.versionNumber}
                    </p>
                    <p className="text-[12px] text-[var(--fg-tertiary)]">
                      {formatDate(version.createdAt)}
                      {version.publishedAt &&
                        ` · Publicado em ${formatDate(version.publishedAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(version.status)}>
                      {version.status}
                    </Badge>
                    {version.id === currentAgent.activeVersionId && (
                      <Badge variant="success">ativa</Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="py-12 text-center text-[13px] text-[var(--fg-tertiary)]">
                Nenhuma versão registrada.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog: editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Editar agente</DialogTitle>
            <DialogDescription>
              Atualize as informações básicas do agente.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              className="space-y-4"
              onSubmit={editForm.handleSubmit(onEditSubmit)}
            >
              <FormField
                control={editForm.control}
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
                control={editForm.control}
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
                control={editForm.control}
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                >
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

      {/* Confirmation: arquivar */}
      <ConfirmationDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Arquivar agente"
        description={
          <>
            O agente <strong>{currentAgent.name}</strong> será arquivado e não
            poderá mais ser executado.
          </>
        }
        confirmLabel="Arquivar agente"
        pending={archiveAgent.isPending}
        destructive
        onConfirm={async () => {
          await archiveAgent.mutateAsync(agentId);
          setArchiveOpen(false);
        }}
      />
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--fg-tertiary)]">{label}</span>
      <span
        className={
          mono
            ? "font-mono text-[12px] tabular-nums text-[var(--fg-primary)]"
            : "font-medium text-[var(--fg-primary)]"
        }
      >
        {value}
      </span>
    </div>
  );
}
