"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Archive,
  BookOpen,
  ChevronDown,
  Cpu,
  ExternalLink,
  FileText,
  Globe,
  Link2,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
  Wrench,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  useAgentContextFiles,
  useAgentContextProfile,
  useAgentContextReferences,
  useArchiveAgentContextFile,
  useCreateAgentContextFile,
  useCreateAgentContextReference,
  useRemoveAgentContextReference,
  useUpsertAgentContextProfile,
} from "src/core/modules/agents/hooks/use-agent-context";
import {
  type AgentTool,
  useArchiveAgent,
  useCompanyAgent,
  useUpdateAgent,
} from "src/core/modules/agents/hooks/use-agents";
import {
  useAgentBuilderCatalog,
  useUpdateAgentModel,
} from "src/core/modules/agents/hooks/use-agent-catalog";
import { ModelPicker } from "src/core/modules/agents/components/model-picker";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { PermissionGate } from "src/core/shared/components/permission-gate";
import { AgentContentLayout } from "src/core/shared/components/ui/agent-content-layout";
import { Button } from "src/core/shared/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "src/core/shared/components/ui/collapsible";
import { ConfirmationDialog } from "src/core/shared/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import { Switch } from "src/core/shared/components/ui/switch";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { z } from "zod";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const agentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

const contextSchema = z.object({
  instructions: z.string().trim().max(10000).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});

const fileSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  objectKey: z.string().trim().min(1),
  publicUrl: z.string().trim().url().optional().or(z.literal("")),
  mimeType: z.string().trim().optional().or(z.literal("")),
});

const referenceSchema = z.object({
  sourceType: z.enum(["brain_entry", "asset", "manual", "web"]),
  sourceId: z.string().trim().min(1),
  label: z.string().trim().max(160).optional().or(z.literal("")),
});

type AgentFormValues = z.infer<typeof agentSchema>;
type ContextFormValues = z.infer<typeof contextSchema>;
type FileFormValues = z.infer<typeof fileSchema>;
type ReferenceFormValues = z.infer<typeof referenceSchema>;

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function ContextProfileSection({
  orgId,
  agentId,
}: {
  orgId: string;
  agentId: string;
}) {
  const profile = useAgentContextProfile(orgId, agentId);
  const upsert = useUpsertAgentContextProfile(orgId, agentId);

  const form = useForm<ContextFormValues>({
    resolver: zodResolver(contextSchema),
    mode: "onBlur",
    defaultValues: { instructions: "", notes: "" },
  });

  useEffect(() => {
    if (profile.data) {
      form.reset({
        instructions: profile.data.instructions ?? "",
        notes: profile.data.notes ?? "",
      });
    }
  }, [profile.data, form]);

  async function onSubmit(values: ContextFormValues) {
    await upsert.mutateAsync({
      instructions: values.instructions?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
    });
  }

  return (
    <section className="space-y-4 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
          <BookOpen className="size-4" />
        </div>
        <div>
          <p className="text-[13.5px] font-semibold text-[var(--fg-primary)]">
            Contexto persistente
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">
            Instruções e notas que o agente carrega em toda execução.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="instructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instruções do agente</FormLabel>
                <FormControl>
                  <Textarea
                    rows={5}
                    placeholder="Descreva como o agente deve se comportar, seu tom, restrições e objetivos principais..."
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Contexto de persona e regras de comportamento.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas internas</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Notas de contexto que não aparecem para o usuário final..."
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Visível apenas para editores do agente.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <PermissionGate permission="agent.update">
            <div className="flex justify-end">
              <Button type="submit" disabled={upsert.isPending} size="sm">
                <Save className="size-3.5" />
                {upsert.isPending ? "Salvando..." : "Salvar contexto"}
              </Button>
            </div>
          </PermissionGate>
        </form>
      </Form>
    </section>
  );
}

function ContextFilesSection({
  orgId,
  agentId,
}: {
  orgId: string;
  agentId: string;
}) {
  const files = useAgentContextFiles(orgId, agentId);
  const createFile = useCreateAgentContextFile(orgId, agentId);
  const archiveFile = useArchiveAgentContextFile(orgId, agentId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<FileFormValues>({
    resolver: zodResolver(fileSchema),
    mode: "onBlur",
    defaultValues: { filename: "", objectKey: "", publicUrl: "", mimeType: "" },
  });

  async function onSubmit(values: FileFormValues) {
    await createFile.mutateAsync({
      filename: values.filename,
      objectKey: values.objectKey,
      publicUrl: values.publicUrl?.trim() || undefined,
      mimeType: values.mimeType?.trim() || undefined,
    });
    form.reset();
    setDialogOpen(false);
  }

  const activeFiles = files.data?.filter((f) => f.status !== "archived") ?? [];

  return (
    <section className="space-y-4 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-sunken)] text-[var(--fg-secondary)]">
            <FileText className="size-4" />
          </div>
          <div>
            <p className="text-[13.5px] font-semibold text-[var(--fg-primary)]">
              Arquivos de contexto
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">
              Documentos que o agente usa como referência.
            </p>
          </div>
        </div>
        <PermissionGate permission="agent.update">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-3.5" />
            Adicionar
          </Button>
        </PermissionGate>
      </div>

      {activeFiles.length > 0 ? (
        <div className="space-y-2">
          {activeFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-sunken)] px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="size-3.5 shrink-0 text-[var(--fg-tertiary)]" />
                <span className="truncate text-[12.5px] text-[var(--fg-primary)]">
                  {file.filename}
                </span>
                {file.mimeType && (
                  <span className="shrink-0 rounded px-1 py-0.5 text-[10px] bg-[var(--bg-raised)] text-[var(--fg-quaternary)]">
                    {file.mimeType}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {file.publicUrl && (
                  <Button variant="ghost" size="icon-sm" asChild>
                    <a
                      href={file.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Abrir arquivo"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                )}
                <PermissionGate permission="agent.update">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-[var(--fg-tertiary)] hover:text-[var(--danger)]"
                    onClick={() => archiveFile.mutate(file.id)}
                    aria-label="Remover arquivo"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </PermissionGate>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12.5px] text-[var(--fg-tertiary)]">
          Nenhum arquivo adicionado ainda.
        </p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar arquivo de contexto</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="filename"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Nome do arquivo</FormLabel>
                    <FormControl>
                      <Input placeholder="documento.pdf" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="objectKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Object key</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="org-id/agent-id/arquivo.pdf"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Caminho do objeto no storage.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="publicUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL pública</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." type="url" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mimeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo MIME</FormLabel>
                    <FormControl>
                      <Input placeholder="application/pdf" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createFile.isPending}>
                  {createFile.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  brain_entry: "Brain",
  asset: "Asset",
  manual: "Manual",
  web: "Web",
};

function ContextReferencesSection({
  orgId,
  agentId,
}: {
  orgId: string;
  agentId: string;
}) {
  const refs = useAgentContextReferences(orgId, agentId);
  const createRef = useCreateAgentContextReference(orgId, agentId);
  const removeRef = useRemoveAgentContextReference(orgId, agentId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<ReferenceFormValues>({
    resolver: zodResolver(referenceSchema),
    mode: "onBlur",
    defaultValues: { sourceType: "manual", sourceId: "", label: "" },
  });

  async function onSubmit(values: ReferenceFormValues) {
    await createRef.mutateAsync({
      sourceType: values.sourceType,
      sourceId: values.sourceId,
      label: values.label?.trim() || undefined,
    });
    form.reset();
    setDialogOpen(false);
  }

  return (
    <section className="space-y-4 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-sunken)] text-[var(--fg-secondary)]">
            <Link2 className="size-4" />
          </div>
          <div>
            <p className="text-[13.5px] font-semibold text-[var(--fg-primary)]">
              Referências de contexto
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">
              Fontes do brain, assets ou externas que o agente consulta.
            </p>
          </div>
        </div>
        <PermissionGate permission="agent.update">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-3.5" />
            Adicionar
          </Button>
        </PermissionGate>
      </div>

      {refs.data && refs.data.length > 0 ? (
        <div className="space-y-2">
          {refs.data.map((ref) => (
            <div
              key={ref.id}
              className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-sunken)] px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--accent-soft)] text-[var(--accent)]">
                  {SOURCE_TYPE_LABELS[ref.sourceType] ?? ref.sourceType}
                </span>
                <span className="truncate text-[12.5px] text-[var(--fg-primary)]">
                  {ref.label ?? ref.sourceId}
                </span>
                {ref.label && (
                  <span className="truncate text-[11px] text-[var(--fg-tertiary)]">
                    {ref.sourceId}
                  </span>
                )}
              </div>
              <PermissionGate permission="agent.update">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-[var(--fg-tertiary)] hover:text-[var(--danger)]"
                  onClick={() => removeRef.mutate(ref.id)}
                  aria-label="Remover referência"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </PermissionGate>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12.5px] text-[var(--fg-tertiary)]">
          Nenhuma referência adicionada ainda.
        </p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar referência de contexto</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="sourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Tipo de fonte</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="brain_entry">Brain</SelectItem>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="web">Web</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sourceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>ID da fonte</FormLabel>
                    <FormControl>
                      <Input placeholder="UUID ou URL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rótulo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome legível da referência"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createRef.isPending}>
                  {createRef.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ─── Tool allowlist ───────────────────────────────────────────────────────────

const AGENT_TOOLS: Array<{
  value: AgentTool;
  label: string;
  description: string;
  icon: typeof Search;
}> = [
  {
    value: "rag_search",
    label: "Consulta ao contexto",
    description:
      "Busca no material indexado da empresa, respeitando permissões.",
    icon: BookOpen,
  },
  {
    value: "file_search",
    label: "Pesquisa em arquivos",
    description:
      "Procura nos arquivos de contexto do agente e documentos indexados.",
    icon: Search,
  },
  {
    value: "web_research",
    label: "Pesquisa na web",
    description: "Consulta fontes externas e retorna evidências resumidas.",
    icon: Globe,
  },
];

function ToolAllowlistSection({
  orgId,
  agentId,
  allowedTools,
}: {
  orgId: string;
  agentId: string;
  allowedTools: AgentTool[];
}) {
  const update = useUpdateAgent(orgId, agentId);

  function toggleTool(tool: AgentTool, enabled: boolean) {
    const next = enabled
      ? [...new Set([...allowedTools, tool])]
      : allowedTools.filter((value) => value !== tool);
    update.mutate({ allowedTools: next });
  }

  return (
    <section className="space-y-4 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
          <Wrench className="size-4" />
        </div>
        <div>
          <p className="text-[13.5px] font-semibold text-[var(--fg-primary)]">
            Ferramentas habilitadas
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">
            Estas ferramentas ficam disponíveis para o agente durante a
            conversa. Nesta fase, elas não alteram dados nem criam execuções de
            workflow por conta própria.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {AGENT_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const checked = allowedTools.includes(tool.value);
          return (
            <div
              key={tool.value}
              className="flex items-center justify-between gap-4 rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-sunken)] px-3 py-2.5"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-[var(--fg-tertiary)]" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium text-[var(--fg-primary)]">
                    {tool.label}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-[var(--fg-tertiary)]">
                    {tool.description}
                  </p>
                </div>
              </div>
              <PermissionGate
                permission="agent.update"
                fallback={
                  <Switch checked={checked} disabled aria-label={tool.label} />
                }
              >
                <Switch
                  checked={checked}
                  disabled={update.isPending}
                  onCheckedChange={(value) => toggleTool(tool.value, value)}
                  aria-label={tool.label}
                />
              </PermissionGate>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Model section ────────────────────────────────────────────────────────────

function ModelSection({
  orgId,
  agentId,
  currentModelId,
}: {
  orgId: string;
  agentId: string;
  currentModelId?: string;
}) {
  const catalog = useAgentBuilderCatalog(orgId);
  const updateModel = useUpdateAgentModel(orgId, agentId);
  const [selectedModelId, setSelectedModelId] = useState(currentModelId ?? "");

  useEffect(() => {
    setSelectedModelId(currentModelId ?? "");
  }, [currentModelId]);

  async function handleModelChange(nextModelId: string) {
    if (!nextModelId || nextModelId === selectedModelId) {
      return;
    }

    const previousModelId = selectedModelId;
    setSelectedModelId(nextModelId);

    try {
      await updateModel.mutateAsync(nextModelId);
    } catch {
      setSelectedModelId(previousModelId);
    }
  }

  return (
    <section className="space-y-4 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
          <Cpu className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold text-[var(--fg-primary)]">
            Modelo de IA
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">
            Modelo utilizado pelo agente nas conversas. Modelos agrupados por provedor.
          </p>
        </div>
      </div>
      <PermissionGate
        permission="agent.update"
        fallback={
          <ModelPicker
            catalog={catalog.data}
            value={selectedModelId}
            onChange={() => undefined}
            disabled
          />
        }
      >
        <ModelPicker
          catalog={catalog.data}
          value={selectedModelId}
          onChange={handleModelChange}
          disabled={updateModel.isPending}
        />
      </PermissionGate>
    </section>
  );
}

function readConfiguredModelId(flowDefinition: unknown) {
  if (!flowDefinition || typeof flowDefinition !== "object") {
    return undefined;
  }

  const flow = flowDefinition as {
    config?: Record<string, unknown>;
    nodes?: Array<{ type?: string; config?: Record<string, unknown> }>;
  };

  if (typeof flow.config?.modelId === "string" && flow.config.modelId.length > 0) {
    return flow.config.modelId;
  }

  const llmNode = flow.nodes?.find(
    (node) =>
      node?.type === "llm_call" &&
      typeof node.config?.modelId === "string" &&
      node.config.modelId.length > 0,
  );

  return typeof llmNode?.config?.modelId === "string"
    ? llmNode.config.modelId
    : undefined;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AgentSettingsPage() {
  const router = useRouter();
  const params = useParams<{ agentId: string }>();
  const agentId = params.agentId;
  const { activeOrgId } = useActiveOrganization();
  const orgId = activeOrgId ?? "";
  const agent = useCompanyAgent(orgId, agentId);
  const update = useUpdateAgent(orgId, agentId);
  const archive = useArchiveAgent(orgId);

  const currentModelId = useMemo(() => {
    const data = agent.data;
    if (!data) return undefined;
    // Prefer the active version; fall back to the latest draft.
    const activeVersion = data.activeVersionId
      ? data.versions?.find((v) => v.id === data.activeVersionId)
      : undefined;
    const version = activeVersion ?? data.versions?.[0];
    return version ? readConfiguredModelId(version.flowDefinition) : undefined;
  }, [agent.data]);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const agentForm = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    mode: "onBlur",
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (agent.data) {
      agentForm.reset({
        name: agent.data.name,
        description: agent.data.description ?? "",
      });
    }
  }, [agent.data, agentForm]);

  async function onAgentSubmit(values: AgentFormValues) {
    await update.mutateAsync({
      name: values.name,
      description: values.description?.trim() || undefined,
    });
  }

  return (
    <AgentContentLayout
      icon={Settings2}
      title="Configurações"
      subtitle="Ajuste o nome, descrição, contexto e estado do agente."
      contentClassName="min-h-0 w-full flex-1 overflow-y-auto px-6 py-6"
    >
      <div className="w-full space-y-6">
        {/* Agent identity */}
        <Form {...agentForm}>
          <form
            onSubmit={agentForm.handleSubmit(onAgentSubmit)}
            className="w-full space-y-4 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-6"
          >
            <FormField
              control={agentForm.control}
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
              control={agentForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="O que este agente faz, em uma linha..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Aparece para os usuários antes de iniciar uma conversa.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <PermissionGate permission="agent.update">
              <div className="flex justify-end">
                <Button type="submit" disabled={update.isPending} size="sm">
                  <Save className="size-3.5" />
                  {update.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </PermissionGate>
          </form>
        </Form>

        {/* Model */}
        <ModelSection
          orgId={orgId}
          agentId={agentId}
          currentModelId={currentModelId}
        />

        {/* Tool allowlist */}
        <ToolAllowlistSection
          orgId={orgId}
          agentId={agentId}
          allowedTools={agent.data?.allowedTools ?? []}
        />

        {/* Persistent context sections */}
        <ContextProfileSection orgId={orgId} agentId={agentId} />
        <ContextFilesSection orgId={orgId} agentId={agentId} />
        <ContextReferencesSection orgId={orgId} agentId={agentId} />

        {/* Danger zone */}
        <PermissionGate permission="agent.delete">
          <Collapsible className="rounded-[var(--r-lg)] border border-[color-mix(in_oklch,var(--danger)_25%,transparent)] bg-[var(--bg-base)]">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <div>
                  <p className="text-[13px] font-medium text-[var(--danger)]">
                    Zona de perigo
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">
                    Ações irreversíveis sobre o agente.
                  </p>
                </div>
                <ChevronDown className="size-4 text-[var(--fg-tertiary)] transition-transform [[data-state=open]_&]:rotate-180" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-3 border-t border-[var(--line-subtle)] px-6 py-4">
                <p className="text-[12.5px] text-[var(--fg-tertiary)]">
                  Arquivar o agente remove ele da lista ativa e impede novas
                  execuções. Você poderá restaurar depois.
                </p>
                <Button
                  variant="destructive"
                  disabled={agent.data?.status === "archived"}
                  onClick={() => setConfirmArchive(true)}
                >
                  <Archive className="size-3.5" />
                  Arquivar agente
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </PermissionGate>
      </div>

      <ConfirmationDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Arquivar agente"
        description={
          <>
            O agente <strong>{agent.data?.name}</strong> será arquivado e não
            poderá receber novas execuções.
          </>
        }
        confirmLabel={archive.isPending ? "Arquivando..." : "Arquivar"}
        pending={archive.isPending}
        destructive
        onConfirm={async () => {
          await archive.mutateAsync(agentId);
          setConfirmArchive(false);
          router.push("/dashboard/workspace/agents");
        }}
      />
    </AgentContentLayout>
  );
}
