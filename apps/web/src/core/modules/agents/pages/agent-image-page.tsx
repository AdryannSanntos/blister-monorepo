"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, ImagePlus, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { PermissionGate } from "src/core/shared/components/permission-gate";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
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
import { Input } from "src/core/shared/components/ui/input";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
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
import { AgentRunDetailSheet } from "../components/agent-run-detail-sheet";
import {
  useAgentRuns,
  useRunAgent,
  type AgentRun,
} from "../hooks/use-agent-runs";
import {
  resolveFlowAgent,
  useCompanyAgents,
} from "../hooks/use-agents";

/* ------------------------------------------------------------------ */
/*  Schema & types                                                     */
/* ------------------------------------------------------------------ */

const schema = z.object({
  description: z.string().min(10, "A descrição precisa de pelo menos 10 caracteres."),
  style: z.string().min(2, "Informe um estilo com pelo menos 2 caracteres."),
  aspectRatio: z.enum(["1:1", "4:5", "16:9"]),
  promptAssist: z.boolean(),
  variationsCount: z.number().min(1).max(4),
  visualReference: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "destructive" | "warning" | "info"> = {
  queued: "secondary",
  running: "info",
  success: "success",
  error: "destructive",
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

function readInputField(run: AgentRun, field: string): string {
  if (typeof run.inputPayload !== "object" || run.inputPayload === null) return "-";
  const payload = run.inputPayload as Record<string, unknown>;
  const value = payload[field];
  return typeof value === "string" && value.length > 0 ? value : "-";
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

/* ------------------------------------------------------------------ */
/*  Columns                                                            */
/* ------------------------------------------------------------------ */

const columns: ColumnDef<AgentRun>[] = [
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
      <Badge variant={STATUS_VARIANT[row.original.status] ?? "secondary"}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: "description",
    header: "Descrição",
    meta: { label: "Descrição" },
    cell: ({ row }) => {
      const description = readInputField(row.original, "description");
      return (
        <span
          className="block max-w-[280px] truncate text-[13px] text-[var(--fg-secondary)]"
          title={description}
        >
          {truncate(description, 80)}
        </span>
      );
    },
    enableSorting: false,
  },
  {
    id: "style",
    header: "Estilo",
    meta: { label: "Estilo" },
    cell: ({ row }) => (
      <span className="text-[13px] text-[var(--fg-secondary)]">
        {readInputField(row.original, "style")}
      </span>
    ),
    enableSorting: false,
  },
  {
    id: "aspectRatio",
    header: "Proporção",
    meta: { label: "Proporção" },
    cell: ({ row }) => (
      <span className="font-mono text-[12px] tabular-nums text-[var(--fg-secondary)]">
        {readInputField(row.original, "aspectRatio")}
      </span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "creditDelta",
    header: "Créditos",
    meta: { label: "Créditos" },
    cell: ({ row }) => (
      <span className="font-mono text-[12px] tabular-nums text-[var(--fg-secondary)]">
        {row.original.creditDelta != null ? Math.abs(row.original.creditDelta) : "-"}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    enableHiding: false,
    enableSorting: false,
    cell: () => null,
  },
];

/* ------------------------------------------------------------------ */
/*  Filters                                                            */
/* ------------------------------------------------------------------ */

const statusFilters: DataTableFilter<AgentRun>[] = [
  {
    id: "status",
    label: "Status",
    options: [
      { label: "Na fila", value: "queued", predicate: (run) => run.status === "queued" },
      { label: "Executando", value: "running", predicate: (run) => run.status === "running" },
      { label: "Sucesso", value: "success", predicate: (run) => run.status === "success" },
      { label: "Erro", value: "error", predicate: (run) => run.status === "error" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AgentImagePage() {
  const { activeOrgId } = useActiveOrganization();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const agents = useCompanyAgents(activeOrgId);
  const resolvedAgent = useMemo(
    () => resolveFlowAgent(agents.data, "image"),
    [agents.data],
  );
  const agentId = resolvedAgent?.id ?? null;

  const runs = useAgentRuns(activeOrgId, undefined, { pollActive: true });
  const imageRuns = useMemo(
    () =>
      (runs.data ?? []).filter((run) => agentId && run.agentId === agentId),
    [runs.data, agentId],
  );

  const runAgent = useRunAgent(activeOrgId, agentId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      description: "",
      style: "realista editorial",
      aspectRatio: "1:1",
      promptAssist: true,
      variationsCount: 2,
      visualReference: "",
    },
  });

  async function onSubmit(values: FormValues) {
    await runAgent.mutateAsync({
      input: {
        description: values.description,
        style: values.style,
        aspectRatio: values.aspectRatio,
        promptAssist: values.promptAssist,
        variationsCount: values.variationsCount,
        visualReference: values.visualReference,
      },
    });
    form.reset();
    setDialogOpen(false);
  }

  const columnsWithAction = useMemo<ColumnDef<AgentRun>[]>(
    () =>
      columns.map((col) => {
        if (col.id !== "actions") return col;
        return {
          ...col,
          cell: ({ row }: { row: { original: AgentRun } }) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRunId(row.original.id)}
            >
              <Eye className="size-4" />
              Detalhes
            </Button>
          ),
        };
      }),
    [],
  );

  if (!activeOrgId) return null;

  return (
    <>
      <PageLayout
        eyebrow="Workspace"
        title="Geração de imagem"
        description="Gere imagens orientadas por briefing, proporção e estilo. Acompanhe todas as execuções e seus resultados operacionais."
        actions={
          <PermissionGate permission="agent.execute">
            <Button onClick={() => setDialogOpen(true)} disabled={!agentId}>
              <ImagePlus className="size-4" />
              Nova geração
            </Button>
          </PermissionGate>
        }
      >
        <DataTable
          columns={columnsWithAction}
          data={imageRuns}
          getRowId={(run) => run.id}
          filters={statusFilters}
          enablePagination
          pageSize={20}
          emptyState={{
            title: "Nenhuma geração de imagem encontrada",
            description:
              "As execuções do agente de imagem aparecerão aqui assim que a primeira geração for iniciada.",
            action: (
              <PermissionGate permission="agent.execute">
                <Button onClick={() => setDialogOpen(true)} disabled={!agentId}>
                  <ImagePlus className="size-4" />
                  Nova geração
                </Button>
              </PermissionGate>
            ),
          }}
          exportOptions={{
            fileName: "image-generations",
            title: "Gerações de imagem",
            columns: [
              { id: "createdAt", label: "Data", value: (run) => formatDate(run.createdAt) },
              { id: "status", label: "Status", value: (run) => run.status },
              { id: "description", label: "Descrição", value: (run) => readInputField(run, "description") },
              { id: "style", label: "Estilo", value: (run) => readInputField(run, "style") },
              { id: "aspectRatio", label: "Proporção", value: (run) => readInputField(run, "aspectRatio") },
              { id: "creditDelta", label: "Créditos", value: (run) => run.creditDelta ?? 0 },
            ],
          }}
        />
      </PageLayout>

      {/* ---- Creation dialog ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Nova geração de imagem</DialogTitle>
            <DialogDescription>
              Preencha o briefing visual. O agente será resolvido automaticamente com base no fluxo de imagem.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder="Descreva a cena, os elementos visuais e a intenção da imagem."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="style"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Estilo</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex.: 3D clean, editorial, studio shot"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aspectRatio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Proporção</FormLabel>
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
                          <SelectItem value="1:1">1:1</SelectItem>
                          <SelectItem value="4:5">4:5</SelectItem>
                          <SelectItem value="16:9">16:9</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                <FormField
                  control={form.control}
                  name="visualReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referência visual</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="URL opcional para referência"
                        />
                      </FormControl>
                      <FormDescription>
                        Opcional. Use quando quiser aproximar composição ou
                        direção de arte.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="variationsCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Variações</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={4}
                          value={String(field.value)}
                          onChange={(event) =>
                            field.onChange(event.target.valueAsNumber || 1)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="promptAssist"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-sunken)] px-4 py-3">
                    <div>
                      <FormLabel>Prompt assist</FormLabel>
                      <FormDescription>
                        Permite que o agente refine internamente o prompt
                        antes da geração.
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

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={runAgent.isPending}>
                  {runAgent.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                  Gerar imagem
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ---- Detail sheet ---- */}
      <AgentRunDetailSheet
        orgId={activeOrgId}
        runId={selectedRunId}
        onClose={() => setSelectedRunId(null)}
      />
    </>
  );
}
