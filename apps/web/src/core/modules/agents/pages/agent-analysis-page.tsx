"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { parseAsString, useQueryStates } from "nuqs";
import { z } from "zod";
import {
  resolveFlowAgent,
  useCompanyAgents,
} from "src/core/modules/agents/hooks/use-agents";
import {
  useAgentRuns,
  useRunAgent,
  type AgentRun,
} from "src/core/modules/agents/hooks/use-agent-runs";
import { AgentRunDetailSheet } from "src/core/modules/agents/components/agent-run-detail-sheet";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { PermissionGate } from "src/core/shared/components/permission-gate";
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
import { Textarea } from "src/core/shared/components/ui/textarea";

/* -------------------------------------------------------------------------- */
/*  Schema                                                                    */
/* -------------------------------------------------------------------------- */

const schema = z.object({
  objective: z.string().min(10, "O objetivo precisa ter pelo menos 10 caracteres."),
  sourceScope: z.enum(["brain", "context", "assets", "design-system"]),
  materialIds: z.string().optional(),
  outputFormat: z.enum(["summary", "bullets", "structured"]),
});

type FormValues = z.infer<typeof schema>;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(run: AgentRun) {
  if (run.status === "queued" || run.status === "running") return "Em andamento";
  const durationMs = Math.max(
    0,
    new Date(run.updatedAt).getTime() - new Date(run.createdAt).getTime(),
  );
  return `${Math.round(durationMs / 1000)}s`;
}

function runStatusVariant(status: string) {
  if (status === "success") return "success" as const;
  if (status === "error") return "destructive" as const;
  if (status === "running") return "warning" as const;
  return "secondary" as const;
}

function runStatusLabel(status: string) {
  if (status === "queued") return "Na fila";
  if (status === "running") return "Executando";
  if (status === "success") return "Concluído";
  if (status === "error") return "Erro";
  return status;
}

function outputSummary(run: AgentRun): string {
  if (!run.outputPayload) return "—";
  if (typeof run.outputPayload === "string") {
    return run.outputPayload.length > 80
      ? `${run.outputPayload.slice(0, 80)}...`
      : run.outputPayload;
  }
  if (typeof run.outputPayload === "object") {
    const payload = run.outputPayload as Record<string, unknown>;
    if (typeof payload.summary === "string") {
      return payload.summary.length > 80
        ? `${payload.summary.slice(0, 80)}...`
        : payload.summary;
    }
    if (typeof payload.text === "string") {
      return payload.text.length > 80
        ? `${payload.text.slice(0, 80)}...`
        : payload.text;
    }
    const keys = Object.keys(payload);
    return keys.length ? `{${keys.slice(0, 3).join(", ")}${keys.length > 3 ? ", ..." : ""}}` : "—";
  }
  return "—";
}

/* -------------------------------------------------------------------------- */
/*  Columns                                                                   */
/* -------------------------------------------------------------------------- */

function buildColumns(onSelectRun: (runId: string) => void): ColumnDef<AgentRun>[] {
  return [
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
          {runStatusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      id: "output",
      header: "Resumo do output",
      meta: { label: "Resumo do output" },
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-[12px] text-[var(--fg-secondary)]">
          {outputSummary(row.original)}
        </span>
      ),
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
      id: "duration",
      header: "Duração",
      meta: { label: "Duração" },
      cell: ({ row }) => (
        <span className="font-mono text-[12px] tabular-nums text-[var(--fg-secondary)]">
          {formatDuration(row.original)}
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
            onClick={() => onSelectRun(row.original.id)}
          >
            <Eye className="size-4" />
            Ver detalhe
          </Button>
        </div>
      ),
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*  Filters                                                                   */
/* -------------------------------------------------------------------------- */

const statusFilters: DataTableFilter<AgentRun>[] = [
  {
    id: "status",
    label: "Status",
    options: [
      {
        label: "Na fila",
        value: "queued",
        predicate: (run) => run.status === "queued",
      },
      {
        label: "Executando",
        value: "running",
        predicate: (run) => run.status === "running",
      },
      {
        label: "Concluído",
        value: "success",
        predicate: (run) => run.status === "success",
      },
      {
        label: "Erro",
        value: "error",
        predicate: (run) => run.status === "error",
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export function AgentAnalysisPage() {
  const { activeOrgId } = useActiveOrganization();

  /* ---- Data ---- */
  const agents = useCompanyAgents(activeOrgId);
  const analysisAgent = resolveFlowAgent(agents.data, "analysis");
  const runs = useAgentRuns(activeOrgId, undefined, { pollActive: true });
  const runAgent = useRunAgent(activeOrgId, analysisAgent?.id ?? null);

  /* ---- UI state ---- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useQueryStates({
    status: parseAsString.withDefault("all"),
  });

  /* ---- Filter runs to only this agent's analysis runs ---- */
  const analysisRuns = useMemo(() => {
    if (!analysisAgent || !runs.data) return [];
    return runs.data.filter((run) => run.agentId === analysisAgent.id);
  }, [analysisAgent, runs.data]);

  /* ---- Columns (stable reference via selectedRunId setter) ---- */
  const columns = useMemo(() => buildColumns(setSelectedRunId), []);

  /* ---- Form ---- */
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      objective: "",
      sourceScope: "brain",
      materialIds: "",
      outputFormat: "structured",
    },
  });

  async function onSubmit(values: FormValues) {
    await runAgent.mutateAsync({
      input: {
        objective: values.objective,
        sourceScope: values.sourceScope,
        materialIds: values.materialIds
          ? values.materialIds
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
        outputFormat: values.outputFormat,
      },
    });
    form.reset();
    setDialogOpen(false);
  }

  if (!activeOrgId) return null;

  return (
    <PageLayout
      eyebrow="Workspace"
      title="Análises"
      description="Histórico de análises operacionais executadas com contexto do workspace. Crie novas análises e acompanhe os resultados."
      actions={
        <PermissionGate permission="agent.execute">
          <Button onClick={() => setDialogOpen(true)}>
            <Sparkles className="size-4" />
            Nova análise
          </Button>
        </PermissionGate>
      }
    >
      <DataTable
        columns={columns}
        data={analysisRuns}
        getRowId={(run) => run.id}
        filters={statusFilters}
        filterValues={filterValues as Record<string, string>}
        onFilterValuesChange={(values) =>
          void setFilterValues(values as { status: string })
        }
        emptyState={{
          title: "Nenhuma análise encontrada",
          description:
            "As análises operacionais aparecerão aqui conforme o workspace executar novas solicitações. Crie a primeira para começar.",
          action: (
            <PermissionGate permission="agent.execute">
              <Button onClick={() => setDialogOpen(true)}>
                <Sparkles className="size-4" />
                Nova análise
              </Button>
            </PermissionGate>
          ),
        }}
        exportOptions={{
          fileName: "analises-operacionais",
          title: "Análises operacionais",
          columns: [
            {
              id: "createdAt",
              label: "Data",
              value: (run) => formatDate(run.createdAt),
            },
            {
              id: "status",
              label: "Status",
              value: (run) => runStatusLabel(run.status),
            },
            {
              id: "output",
              label: "Resumo do output",
              value: (run) => outputSummary(run),
            },
            {
              id: "credits",
              label: "Créditos",
              value: (run) => Math.abs(run.creditDelta ?? 0),
            },
            {
              id: "duration",
              label: "Duração",
              value: (run) => formatDuration(run),
            },
          ],
        }}
      />

      {/* ---- Detail Sheet ---- */}
      <AgentRunDetailSheet
        orgId={activeOrgId}
        runId={selectedRunId}
        onClose={() => setSelectedRunId(null)}
      />

      {/* ---- Creation Dialog ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Nova análise operacional</DialogTitle>
            <DialogDescription>
              Descreva o objetivo, selecione a fonte de contexto e o formato de
              saída desejado. O agente de análise será resolvido automaticamente.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="objective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Objetivo</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder="Descreva a pergunta ou decisão que a análise precisa responder."
                      />
                    </FormControl>
                    <FormDescription>
                      Seja específico sobre contexto, restrições e tipo de
                      recomendação esperada.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sourceScope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Fonte principal</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="brain">Brain</SelectItem>
                          <SelectItem value="context">Contexto</SelectItem>
                          <SelectItem value="assets">Assets</SelectItem>
                          <SelectItem value="design-system">
                            Design System
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="outputFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Formato de saída</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="summary">
                            Resumo executivo
                          </SelectItem>
                          <SelectItem value="bullets">Bullets</SelectItem>
                          <SelectItem value="structured">
                            Estruturado
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="materialIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Materiais específicos</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="id-1, id-2, id-3"
                      />
                    </FormControl>
                    <FormDescription>
                      Opcional. Liste IDs quando quiser forçar a leitura de
                      materiais já conhecidos.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={runAgent.isPending || !analysisAgent}
                >
                  {runAgent.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Executar análise
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
