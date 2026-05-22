"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Loader2, Mail, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { AgentRunDetailSheet } from "../components/agent-run-detail-sheet";
import {
  resolveFlowAgent,
  useCompanyAgents,
} from "../hooks/use-agents";
import {
  useAgentRuns,
  useRunAgent,
  type AgentRun,
} from "../hooks/use-agent-runs";
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
import { Switch } from "src/core/shared/components/ui/switch";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*  Schema                                                                     */
/* -------------------------------------------------------------------------- */

const emailFormSchema = z.object({
  emailType: z.enum(["transactional", "marketing", "newsletter", "follow-up"]),
  objective: z.string().min(10, "Descreva o objetivo com pelo menos 10 caracteres."),
  recipientSegment: z.string().min(2, "Informe o segmento de destinatários."),
  tone: z.enum(["direct", "expert", "friendly", "premium"]),
  cta: z.string().min(2, "Informe a chamada para ação."),
  length: z.enum(["short", "medium", "long"]),
  includeSubject: z.boolean(),
  includePreviewText: z.boolean(),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
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

function statusVariant(status: string) {
  if (status === "success") return "success" as const;
  if (status === "error") return "destructive" as const;
  if (status === "running") return "warning" as const;
  return "secondary" as const;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    queued: "Na fila",
    running: "Executando",
    success: "Concluído",
    error: "Erro",
  };
  return labels[status] ?? status;
}

const emailTypeLabels: Record<string, string> = {
  transactional: "Transacional",
  marketing: "Marketing",
  newsletter: "Newsletter",
  "follow-up": "Follow-up",
};

const toneLabels: Record<string, string> = {
  direct: "Direto",
  expert: "Especialista",
  friendly: "Próximo",
  premium: "Premium",
};

function resolveInputField(input: unknown, key: string): string {
  if (typeof input !== "object" || input === null) return "—";
  const record = input as Record<string, unknown>;
  const value = record[key];
  if (typeof value === "string") return value;
  return "—";
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

/* -------------------------------------------------------------------------- */
/*  Columns                                                                    */
/* -------------------------------------------------------------------------- */

function buildColumns(onSelectRun: (id: string) => void): ColumnDef<AgentRun>[] {
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
        <Badge variant={statusVariant(row.original.status)}>
          {statusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      id: "emailType",
      header: "Tipo de e-mail",
      meta: { label: "Tipo de e-mail" },
      cell: ({ row }) => {
        const type = resolveInputField(row.original.inputPayload, "emailType");
        return (
          <span className="text-[13px] text-[var(--fg-secondary)]">
            {emailTypeLabels[type] ?? type}
          </span>
        );
      },
    },
    {
      id: "objective",
      header: "Objetivo",
      meta: { label: "Objetivo" },
      cell: ({ row }) => {
        const objective = resolveInputField(row.original.inputPayload, "objective");
        return (
          <span className="text-[13px] text-[var(--fg-secondary)]" title={objective}>
            {truncate(objective, 60)}
          </span>
        );
      },
    },
    {
      id: "tone",
      header: "Tom",
      meta: { label: "Tom" },
      cell: ({ row }) => {
        const tone = resolveInputField(row.original.inputPayload, "tone");
        return (
          <Badge variant="secondary">
            {toneLabels[tone] ?? tone}
          </Badge>
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
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectRun(row.original.id)}
          >
            <Eye className="size-4" />
            Ver detalhe
          </Button>
          <Button variant="ghost" size="sm" disabled title="Envio disponível em breve">
            <Send className="size-4" />
            Enviar
          </Button>
        </div>
      ),
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*  Filters                                                                    */
/* -------------------------------------------------------------------------- */

const statusFilters: DataTableFilter<AgentRun> = {
  id: "status",
  label: "Status",
  options: [
    { label: "Na fila", value: "queued", predicate: (run) => run.status === "queued" },
    { label: "Executando", value: "running", predicate: (run) => run.status === "running" },
    { label: "Concluído", value: "success", predicate: (run) => run.status === "success" },
    { label: "Erro", value: "error", predicate: (run) => run.status === "error" },
  ],
};

const emailTypeFilters: DataTableFilter<AgentRun> = {
  id: "emailType",
  label: "Tipo de e-mail",
  options: [
    {
      label: "Transacional",
      value: "transactional",
      predicate: (run) => resolveInputField(run.inputPayload, "emailType") === "transactional",
    },
    {
      label: "Marketing",
      value: "marketing",
      predicate: (run) => resolveInputField(run.inputPayload, "emailType") === "marketing",
    },
    {
      label: "Newsletter",
      value: "newsletter",
      predicate: (run) => resolveInputField(run.inputPayload, "emailType") === "newsletter",
    },
    {
      label: "Follow-up",
      value: "follow-up",
      predicate: (run) => resolveInputField(run.inputPayload, "emailType") === "follow-up",
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function AgentEmailPage() {
  const { activeOrgId } = useActiveOrganization();
  const agents = useCompanyAgents(activeOrgId);

  const emailAgent = resolveFlowAgent(agents.data, "email");
  const agentId = emailAgent?.id ?? null;

  const runs = useAgentRuns(
    activeOrgId,
    agentId ? { agentId } : undefined,
    { pollActive: true },
  );

  const runAgent = useRunAgent(activeOrgId, agentId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    mode: "onBlur",
    defaultValues: {
      emailType: "transactional",
      objective: "",
      recipientSegment: "",
      tone: "direct",
      cta: "",
      length: "medium",
      includeSubject: true,
      includePreviewText: true,
    },
  });

  const columns = useMemo(() => buildColumns(setSelectedRunId), []);

  const filters: DataTableFilter<AgentRun>[] = useMemo(
    () => [statusFilters, emailTypeFilters],
    [],
  );

  async function onSubmit(values: EmailFormValues) {
    await runAgent.mutateAsync({
      input: {
        emailType: values.emailType,
        objective: values.objective,
        recipientSegment: values.recipientSegment,
        tone: values.tone,
        cta: values.cta,
        length: values.length,
        includeSubject: values.includeSubject,
        includePreviewText: values.includePreviewText,
      },
    });
    form.reset();
    setDialogOpen(false);
  }

  if (!activeOrgId) return null;

  return (
    <>
      <PageLayout
        eyebrow="Workspace"
        title="E-mail"
        description="Gere e-mails orientados por objetivo, segmento e tom, com histórico completo de execuções e controle de créditos."
        actions={
          <PermissionGate permission="agent.execute">
            <Button onClick={() => setDialogOpen(true)}>
              <Mail className="size-4" />
              Gerar e-mail
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
          pageSize={10}
          emptyState={{
            icon: Mail,
            title: "Nenhuma geração de e-mail encontrada",
            description:
              "As execuções do agente de e-mail aparecerão aqui conforme você gerar novos conteúdos.",
            action: (
              <PermissionGate permission="agent.execute">
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                  <Mail className="size-4" />
                  Gerar primeiro e-mail
                </Button>
              </PermissionGate>
            ),
          }}
          exportOptions={{
            fileName: "agent-email-runs",
            title: "Histórico de geração de e-mails",
            columns: [
              { id: "date", label: "Data", value: (run) => formatDate(run.createdAt) },
              { id: "status", label: "Status", value: (run) => statusLabel(run.status) },
              {
                id: "emailType",
                label: "Tipo de e-mail",
                value: (run) => {
                  const type = resolveInputField(run.inputPayload, "emailType");
                  return emailTypeLabels[type] ?? type;
                },
              },
              {
                id: "objective",
                label: "Objetivo",
                value: (run) => resolveInputField(run.inputPayload, "objective"),
              },
              {
                id: "tone",
                label: "Tom",
                value: (run) => {
                  const tone = resolveInputField(run.inputPayload, "tone");
                  return toneLabels[tone] ?? tone;
                },
              },
              {
                id: "credits",
                label: "Créditos",
                value: (run) => Math.abs(run.creditDelta ?? 0),
              },
            ],
          }}
        />
      </PageLayout>

      {/* ------------------------------------------------------------------ */}
      {/*  Creation Dialog                                                     */}
      {/* ------------------------------------------------------------------ */}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Gerar e-mail</DialogTitle>
            <DialogDescription>
              Preencha o briefing para que o agente gere o conteúdo do e-mail com base no contexto do workspace.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="emailType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Tipo de e-mail</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="transactional">Transacional</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="newsletter">Newsletter</SelectItem>
                          <SelectItem value="follow-up">Follow-up</SelectItem>
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
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="direct">Direto</SelectItem>
                          <SelectItem value="expert">Especialista</SelectItem>
                          <SelectItem value="friendly">Próximo</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
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
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder="Descreva o que o e-mail precisa comunicar, a ação esperada do destinatário e o contexto da campanha."
                      />
                    </FormControl>
                    <FormDescription>
                      Seja específico sobre a intenção, restrições e resultado esperado.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recipientSegment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Segmento de destinatários</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex.: leads qualificados do funil de vendas B2B"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Chamada para ação (CTA)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex.: Agendar reunião, Baixar material, Confirmar pedido"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="length"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Extensão</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="short">Curto</SelectItem>
                        <SelectItem value="medium">Médio</SelectItem>
                        <SelectItem value="long">Longo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="includeSubject"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-sunken)] px-4 py-3">
                      <div>
                        <FormLabel>Incluir assunto</FormLabel>
                        <FormDescription>
                          O agente também gerará uma sugestão de linha de assunto.
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
                <FormField
                  control={form.control}
                  name="includePreviewText"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-sunken)] px-4 py-3">
                      <div>
                        <FormLabel>Incluir preview text</FormLabel>
                        <FormDescription>
                          Gera o texto de pré-visualização exibido na caixa de entrada.
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
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <PermissionGate permission="agent.execute">
                  <Button type="submit" disabled={runAgent.isPending}>
                    {runAgent.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Mail className="size-4" />
                    )}
                    Gerar e-mail
                  </Button>
                </PermissionGate>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/*  Run Detail Sheet                                                    */}
      {/* ------------------------------------------------------------------ */}

      <AgentRunDetailSheet
        orgId={activeOrgId}
        runId={selectedRunId}
        onClose={() => setSelectedRunId(null)}
      />
    </>
  );
}
