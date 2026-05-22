"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Loader2, Plus, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { resolveFlowAgent, useCompanyAgents } from "../hooks/use-agents";
import { useAgentRuns, useRunAgent, type AgentRun } from "../hooks/use-agent-runs";
import { AgentRunDetailSheet } from "../components/agent-run-detail-sheet";

import { PermissionGate } from "src/core/shared/components/permission-gate";
import { type ColumnDef, DataTable, type DataTableFilter } from "src/core/shared/components/ui/data-table";
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
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
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

/* -------------------------------------------------------------------------- */
/*  Schema                                                                     */
/* -------------------------------------------------------------------------- */

const postFormSchema = z.object({
  topic: z.string().min(5, "O tema precisa ter pelo menos 5 caracteres."),
  platform: z.enum(["instagram", "linkedin", "twitter", "tiktok", "youtube"]),
  objective: z.string().min(3, "O objetivo precisa ter pelo menos 3 caracteres."),
  format: z.enum(["feed", "stories", "carousel", "reels"]),
  includeCreative: z.boolean(),
  tone: z.enum(["direct", "expert", "friendly", "premium"]),
  hashtagsBehavior: z.enum(["auto", "manual", "none"]),
});

type PostFormValues = z.infer<typeof postFormSchema>;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  twitter: "Twitter",
  tiktok: "TikTok",
  youtube: "YouTube",
};

const FORMAT_LABELS: Record<string, string> = {
  feed: "Feed",
  stories: "Stories",
  carousel: "Carousel",
  reels: "Reels",
};

const TONE_LABELS: Record<string, string> = {
  direct: "Direto",
  expert: "Especialista",
  friendly: "Amigável",
  premium: "Premium",
};

const HASHTAGS_LABELS: Record<string, string> = {
  auto: "Automático",
  manual: "Manual",
  none: "Nenhum",
};

const STATUS_LABELS: Record<string, string> = {
  queued: "Na fila",
  running: "Executando",
  success: "Concluído",
  error: "Erro",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function runStatusVariant(status: string) {
  if (status === "success") return "success" as const;
  if (status === "error") return "destructive" as const;
  if (status === "running") return "warning" as const;
  return "secondary" as const;
}

function extractInputField(run: AgentRun, key: string): string {
  if (typeof run.inputPayload !== "object" || run.inputPayload === null) return "";
  return String((run.inputPayload as Record<string, unknown>)[key] ?? "");
}

function truncate(text: string, maxLength = 48): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function AgentPostPage() {
  const { activeOrgId } = useActiveOrganization();
  const agents = useCompanyAgents(activeOrgId);

  const postAgent = resolveFlowAgent(agents.data, "post");
  const agentId = postAgent?.id ?? null;

  const runs = useAgentRuns(
    activeOrgId,
    agentId ? { agentId } : undefined,
    { pollActive: true },
  );

  const runAgent = useRunAgent(activeOrgId, agentId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    mode: "onBlur",
    defaultValues: {
      topic: "",
      platform: "instagram",
      objective: "",
      format: "feed",
      includeCreative: false,
      tone: "direct",
      hashtagsBehavior: "auto",
    },
  });

  async function onSubmit(values: PostFormValues) {
    await runAgent.mutateAsync({
      input: {
        topic: values.topic,
        platform: values.platform,
        objective: values.objective,
        format: values.format,
        includeCreative: values.includeCreative,
        tone: values.tone,
        hashtagsBehavior: values.hashtagsBehavior,
      },
    });
    form.reset();
    setDialogOpen(false);
  }

  /* ---- Filters ---- */

  const filters: DataTableFilter<AgentRun>[] = useMemo(
    () => [
      {
        id: "status",
        label: "Status",
        options: [
          { label: "Na fila", value: "queued", predicate: (run) => run.status === "queued" },
          { label: "Executando", value: "running", predicate: (run) => run.status === "running" },
          { label: "Concluído", value: "success", predicate: (run) => run.status === "success" },
          { label: "Erro", value: "error", predicate: (run) => run.status === "error" },
        ],
      },
      {
        id: "platform",
        label: "Plataforma",
        options: Object.entries(PLATFORM_LABELS).map(([value, label]) => ({
          value,
          label,
          predicate: (run: AgentRun) => extractInputField(run, "platform") === value,
        })),
      },
    ],
    [],
  );

  /* ---- Columns ---- */

  const columns: ColumnDef<AgentRun>[] = useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: "Data",
        meta: { label: "Data" },
        cell: ({ row }) => (
          <span className="font-mono text-[12px] tabular-nums text-[var(--fg-tertiary)]">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: { label: "Status" },
        cell: ({ row }) => (
          <Badge variant={runStatusVariant(row.original.status)}>
            {STATUS_LABELS[row.original.status] ?? row.original.status}
          </Badge>
        ),
      },
      {
        id: "topic",
        header: "Tema",
        meta: { label: "Tema" },
        cell: ({ row }) => {
          const topic = extractInputField(row.original, "topic");
          return (
            <span
              className="text-[13px] text-[var(--fg-primary)]"
              title={topic}
            >
              {truncate(topic)}
            </span>
          );
        },
      },
      {
        id: "platform",
        header: "Plataforma",
        meta: { label: "Plataforma" },
        cell: ({ row }) => {
          const platform = extractInputField(row.original, "platform");
          return (
            <Badge variant="secondary">
              {PLATFORM_LABELS[platform] ?? platform}
            </Badge>
          );
        },
      },
      {
        id: "format",
        header: "Formato",
        meta: { label: "Formato" },
        cell: ({ row }) => {
          const format = extractInputField(row.original, "format");
          return (
            <span className="text-[12px] text-[var(--fg-secondary)]">
              {FORMAT_LABELS[format] ?? format}
            </span>
          );
        },
      },
      {
        id: "credits",
        header: "Créditos",
        meta: { label: "Créditos" },
        cell: ({ row }) => (
          <span className="font-mono text-[12px] tabular-nums text-[var(--fg-secondary)]">
            {Math.abs(row.original.creditDelta ?? 0)}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRunId(row.original.id)}
            >
              <Eye className="size-4" />
              Ver detalhe
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  if (!activeOrgId) return null;

  return (
    <>
      <PageLayout
        eyebrow="Agentes"
        title="Geração de posts"
        description="Crie posts para redes sociais com briefing de tema, plataforma, formato e tom. Acompanhe todas as execuções anteriores e seus resultados."
        actions={
          <PermissionGate permission="agent.execute">
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              Novo post
            </Button>
          </PermissionGate>
        }
      >
        <DataTable
          columns={columns}
          data={runs.data ?? []}
          getRowId={(run) => run.id}
          filters={filters}
          enablePagination
          pageSize={15}
          emptyState={{
            title: "Nenhuma geração encontrada",
            description:
              "As execuções do agente de posts aparecerão aqui. Clique em \"Novo post\" para criar a primeira.",
            action: (
              <PermissionGate permission="agent.execute">
                <Button variant="outline" onClick={() => setDialogOpen(true)}>
                  <Plus className="size-4" />
                  Criar primeiro post
                </Button>
              </PermissionGate>
            ),
          }}
          exportOptions={{
            fileName: "agent-posts",
            title: "Geração de posts",
            columns: [
              { id: "date", label: "Data", value: (run) => formatDate(run.createdAt) },
              { id: "status", label: "Status", value: (run) => STATUS_LABELS[run.status] ?? run.status },
              { id: "topic", label: "Tema", value: (run) => extractInputField(run, "topic") },
              { id: "platform", label: "Plataforma", value: (run) => PLATFORM_LABELS[extractInputField(run, "platform")] ?? extractInputField(run, "platform") },
              { id: "format", label: "Formato", value: (run) => FORMAT_LABELS[extractInputField(run, "format")] ?? extractInputField(run, "format") },
              { id: "credits", label: "Créditos", value: (run) => Math.abs(run.creditDelta ?? 0) },
            ],
          }}
        />
      </PageLayout>

      {/* ---- Creation dialog ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Novo post</DialogTitle>
            <DialogDescription>
              Preencha o briefing para gerar um post. O agente utilizará o contexto do workspace para produzir o conteúdo.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Tema</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="Descreva o tema principal do post. Ex.: Lançamento do produto X com foco em benefícios para PMEs."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Plataforma</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a plataforma" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="twitter">Twitter</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="format"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Formato</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o formato" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="feed">Feed</SelectItem>
                          <SelectItem value="stories">Stories</SelectItem>
                          <SelectItem value="carousel">Carousel</SelectItem>
                          <SelectItem value="reels">Reels</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="objective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Objetivo</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex.: Gerar engajamento com público técnico"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Tom</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="direct">Direto</SelectItem>
                          <SelectItem value="expert">Especialista</SelectItem>
                          <SelectItem value="friendly">Amigável</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hashtagsBehavior"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Hashtags</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="auto">Automático</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="none">Nenhum</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        No modo automático, o agente seleciona hashtags relevantes.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="includeCreative"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-sunken)] px-4 py-3">
                    <div>
                      <FormLabel>Incluir criativo</FormLabel>
                      <FormDescription>
                        Gera uma sugestão visual junto com o texto do post.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  title="Publicação direta disponível em breve"
                >
                  <Send className="size-4" />
                  Publicar
                </Button>

                <PermissionGate permission="agent.execute">
                  <Button type="submit" disabled={runAgent.isPending}>
                    {runAgent.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Gerar post
                  </Button>
                </PermissionGate>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ---- Run detail sheet ---- */}
      <AgentRunDetailSheet
        orgId={activeOrgId}
        runId={selectedRunId}
        onClose={() => setSelectedRunId(null)}
      />
    </>
  );
}
