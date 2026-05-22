"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CopyPlus, Eye, FileText, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
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
import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Schema & types                                                     */
/* ------------------------------------------------------------------ */

const copyTypes = ["ad", "email", "landing-page", "social"] as const;
const tones = ["direct", "expert", "friendly", "premium"] as const;

const schema = z.object({
  copyType: z.enum(copyTypes),
  productService: z.string().min(2, "Informe o produto ou serviço."),
  targetAudience: z.string().min(2, "Informe o público-alvo."),
  tone: z.enum(tones),
  platforms: z.string().min(2, "Informe ao menos uma plataforma."),
  references: z.string().optional(),
  variationsCount: z.number().min(1).max(6),
});

type FormValues = z.infer<typeof schema>;

/* ------------------------------------------------------------------ */
/*  Label maps                                                         */
/* ------------------------------------------------------------------ */

const copyTypeLabels: Record<(typeof copyTypes)[number], string> = {
  ad: "Ads",
  email: "Email",
  "landing-page": "Landing page",
  social: "Social",
};

const toneLabels: Record<(typeof tones)[number], string> = {
  direct: "Direto",
  expert: "Especialista",
  friendly: "Próximo",
  premium: "Premium",
};

const statusLabels: Record<string, string> = {
  queued: "Na fila",
  running: "Executando",
  success: "Concluído",
  error: "Erro",
};

function statusVariant(status: string): "secondary" | "info" | "success" | "destructive" {
  switch (status) {
    case "queued":
      return "secondary";
    case "running":
      return "info";
    case "success":
      return "success";
    case "error":
      return "destructive";
    default:
      return "secondary";
  }
}

function formatDate(value: string) {
  try {
    return format(new Date(value), "dd MMM yyyy, HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
}

function extractInputField(run: AgentRun, key: string): string {
  if (
    typeof run.inputPayload === "object" &&
    run.inputPayload !== null &&
    key in (run.inputPayload as Record<string, unknown>)
  ) {
    return String((run.inputPayload as Record<string, unknown>)[key] ?? "—");
  }
  return "—";
}

/* ------------------------------------------------------------------ */
/*  Table columns                                                      */
/* ------------------------------------------------------------------ */

function buildColumns(onViewRun: (id: string) => void): ColumnDef<AgentRun>[] {
  return [
    {
      id: "date",
      header: "Data",
      meta: { label: "Data" },
      accessorFn: (row) => row.createdAt,
      cell: ({ row }) => (
        <span className="text-[13px] text-[var(--fg-secondary)]">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      meta: { label: "Status" },
      accessorFn: (row) => row.status,
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.status)}>
          {statusLabels[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: "copyType",
      header: "Tipo de copy",
      meta: { label: "Tipo de copy" },
      accessorFn: (row) => extractInputField(row, "copyType"),
      cell: ({ row }) => {
        const value = extractInputField(row.original, "copyType");
        return (
          <span className="text-[13px] text-[var(--fg-secondary)]">
            {copyTypeLabels[value as keyof typeof copyTypeLabels] ?? value}
          </span>
        );
      },
    },
    {
      id: "productService",
      header: "Produto / serviço",
      meta: { label: "Produto / serviço" },
      accessorFn: (row) => extractInputField(row, "productService"),
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate text-[13px] text-[var(--fg-primary)]">
          {extractInputField(row.original, "productService")}
        </span>
      ),
    },
    {
      id: "tone",
      header: "Tom",
      meta: { label: "Tom" },
      accessorFn: (row) => extractInputField(row, "tone"),
      cell: ({ row }) => {
        const value = extractInputField(row.original, "tone");
        return (
          <span className="text-[13px] text-[var(--fg-secondary)]">
            {toneLabels[value as keyof typeof toneLabels] ?? value}
          </span>
        );
      },
    },
    {
      id: "credits",
      header: "Créditos",
      meta: { label: "Créditos" },
      accessorFn: (row) => row.creditDelta ?? 0,
      cell: ({ row }) => (
        <span className="font-mono text-[13px] tabular-nums text-[var(--fg-secondary)]">
          {row.original.creditDelta ?? "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Ver detalhes"
          onClick={() => onViewRun(row.original.id)}
        >
          <Eye className="size-4" />
        </Button>
      ),
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Filters                                                            */
/* ------------------------------------------------------------------ */

const filters: DataTableFilter<AgentRun>[] = [
  {
    id: "status",
    label: "Status",
    options: [
      { label: "Na fila", value: "queued", predicate: (r) => r.status === "queued" },
      { label: "Executando", value: "running", predicate: (r) => r.status === "running" },
      { label: "Concluído", value: "success", predicate: (r) => r.status === "success" },
      { label: "Erro", value: "error", predicate: (r) => r.status === "error" },
    ],
  },
  {
    id: "copyType",
    label: "Tipo de copy",
    options: [
      { label: "Ads", value: "ad", predicate: (r) => extractInputField(r, "copyType") === "ad" },
      { label: "Email", value: "email", predicate: (r) => extractInputField(r, "copyType") === "email" },
      { label: "Landing page", value: "landing-page", predicate: (r) => extractInputField(r, "copyType") === "landing-page" },
      { label: "Social", value: "social", predicate: (r) => extractInputField(r, "copyType") === "social" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Export options                                                     */
/* ------------------------------------------------------------------ */

const exportOptions = {
  fileName: "copy-runs",
  title: "Execuções de copy",
  columns: [
    { id: "date", label: "Data", value: (r: AgentRun) => formatDate(r.createdAt) },
    { id: "status", label: "Status", value: (r: AgentRun) => statusLabels[r.status] ?? r.status },
    { id: "copyType", label: "Tipo de copy", value: (r: AgentRun) => extractInputField(r, "copyType") },
    { id: "productService", label: "Produto / serviço", value: (r: AgentRun) => extractInputField(r, "productService") },
    { id: "tone", label: "Tom", value: (r: AgentRun) => extractInputField(r, "tone") },
    { id: "credits", label: "Créditos", value: (r: AgentRun) => r.creditDelta ?? 0 },
  ],
};

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export function AgentCopyPage() {
  const { activeOrgId } = useActiveOrganization();
  const agents = useCompanyAgents(activeOrgId);
  const runs = useAgentRuns(activeOrgId, undefined, { pollActive: true });

  const copyAgent = useMemo(
    () => resolveFlowAgent(agents.data, "copy"),
    [agents.data],
  );

  const runAgent = useRunAgent(activeOrgId, copyAgent?.id ?? null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const tableColumns = useMemo(
    () => buildColumns((id) => setSelectedRunId(id)),
    [],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      copyType: "social",
      productService: "",
      targetAudience: "",
      tone: "direct",
      platforms: "Instagram, LinkedIn",
      references: "",
      variationsCount: 3,
    },
  });

  async function onSubmit(values: FormValues) {
    await runAgent.mutateAsync({
      input: {
        copyType: values.copyType,
        productService: values.productService,
        targetAudience: values.targetAudience,
        tone: values.tone,
        platforms: values.platforms
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        references: values.references,
        variationsCount: values.variationsCount,
      },
    });
    form.reset();
    setDialogOpen(false);
  }

  if (!activeOrgId) return null;

  return (
    <PageLayout
      eyebrow="Workspace"
      title="Copy"
      description="Gere variações de copy com briefing de canal, público-alvo e tom, mantendo o contexto operacional da company no mesmo fluxo."
      actions={
        <PermissionGate permission="agent.execute">
          <Button onClick={() => setDialogOpen(true)}>
            <CopyPlus className="size-4" />
            Nova execução
          </Button>
        </PermissionGate>
      }
    >
      {/* ---- Runs table ---- */}
      <DataTable
        columns={tableColumns}
        data={runs.data ?? []}
        filters={filters}
        exportOptions={exportOptions}
        enablePagination
        pageSize={10}
        getRowId={(row) => row.id}
        emptyState={{
          icon: FileText,
          title: "Nenhuma execução de copy",
          description:
            "As execuções aparecem aqui depois que você gera variações de copy. Crie a primeira para começar.",
          action: (
            <PermissionGate permission="agent.execute">
              <Button onClick={() => setDialogOpen(true)}>
                <CopyPlus className="size-4" />
                Nova execução
              </Button>
            </PermissionGate>
          ),
        }}
      />

      {/* ---- Run detail sheet ---- */}
      <AgentRunDetailSheet
        orgId={activeOrgId}
        runId={selectedRunId}
        onClose={() => setSelectedRunId(null)}
      />

      {/* ---- Creation dialog ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Brief de copy</DialogTitle>
            <DialogDescription>
              Preencha o briefing para gerar variações de copy.
              {copyAgent
                ? ` Agente: ${copyAgent.name}.`
                : " Nenhum agente de copy disponível."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="copyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Tipo de copy</FormLabel>
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
                          {copyTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {copyTypeLabels[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Tom</FormLabel>
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
                          {tones.map((tone) => (
                            <SelectItem key={tone} value={tone}>
                              {toneLabels[tone]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="productService"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Produto / serviço</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex.: consultoria de growth B2B"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Público-alvo</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex.: heads de marketing de SaaS"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="platforms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Plataformas</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Instagram, LinkedIn, Meta Ads"
                      />
                    </FormControl>
                    <FormDescription>
                      Separe por vírgula quando precisar orientar mais de um
                      canal.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
                <FormField
                  control={form.control}
                  name="references"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referências</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={4}
                          placeholder="Diferenciais, bullets comerciais, exemplos e restrições de linguagem."
                        />
                      </FormControl>
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
                          max={6}
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
                  disabled={runAgent.isPending || !copyAgent}
                >
                  {runAgent.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CopyPlus className="size-4" />
                  )}
                  Gerar copy
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
