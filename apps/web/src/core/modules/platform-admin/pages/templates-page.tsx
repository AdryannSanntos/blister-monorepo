"use client";

import { Bot, LayoutTemplate, Sparkles } from "lucide-react";
import { Badge } from "src/core/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { PlatformAdminStatCard } from "../components/platform-admin-primitives";

type TemplateRow = {
  id: string;
  name: string;
  category: string;
  status: string;
  description: string;
};

const columns: ColumnDef<TemplateRow>[] = [
  {
    accessorKey: "name",
    header: "Template",
    meta: { label: "Template" },
    cell: ({ row }) => (
      <div>
        <p className="text-[13px] font-medium text-[var(--fg-primary)]">
          {row.original.name}
        </p>
        <p className="text-[12px] text-[var(--fg-tertiary)]">
          {row.original.description}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Categoria",
    meta: { label: "Categoria" },
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === "planejado" ? "warning" : "secondary"}
      >
        {row.original.status}
      </Badge>
    ),
  },
];

const rows: TemplateRow[] = [
  {
    id: "briefing-base",
    name: "Briefing operacional base",
    category: "Operacao",
    status: "planejado",
    description:
      "Esqueleto de agentes para coleta de contexto e handoff inicial.",
  },
  {
    id: "content-studio",
    name: "Content studio",
    category: "Marketing",
    status: "planejado",
    description:
      "Pacote global para criacao, revisao e adaptacao de conteudo recorrente.",
  },
  {
    id: "ops-monitoring",
    name: "Ops monitoring",
    category: "Observabilidade",
    status: "backlog",
    description:
      "Template para agentes que fiscalizam runs, custos e excecoes em larga escala.",
  },
];

export function TemplatesPage() {
  return (
    <PageLayout
      eyebrow="Conta"
      title="Templates globais"
      description="Esta area foi refeita para deixar claro o papel do catalogo global de agentes base, mesmo antes da persistencia real entrar em producao."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <PlatformAdminStatCard
          label="Planejados"
          value={String(
            rows.filter((row) => row.status === "planejado").length,
          )}
          hint="Templates que ja tem espaco reservado para a proxima fase do foundation."
          icon={LayoutTemplate}
        />
        <PlatformAdminStatCard
          label="Categorias"
          value={String(new Set(rows.map((row) => row.category)).size)}
          hint="Frentes operacionais ja mapeadas para o catalogo global futuro."
          icon={Sparkles}
        />
        <PlatformAdminStatCard
          label="Dependencia"
          value="Agent versions"
          hint="A entrega real depende do dominio de agentes e historico evoluirem juntos."
          icon={Bot}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="bg-[var(--bg-base)]">
          <CardHeader className="border-b border-[var(--line-subtle)] pb-5">
            <CardTitle className="text-[18px]">Roadmap do catalogo</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <DataTable
              columns={columns}
              data={rows}
              enablePagination={false}
              exportOptions={{
                fileName: "platform-template-roadmap",
                title: "Roadmap de templates globais",
                columns: [
                  { id: "name", label: "Template", value: (row) => row.name },
                  {
                    id: "category",
                    label: "Categoria",
                    value: (row) => row.category,
                  },
                  { id: "status", label: "Status", value: (row) => row.status },
                  {
                    id: "description",
                    label: "Descricao",
                    value: (row) => row.description,
                  },
                ],
              }}
            />
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-base)]">
          <CardHeader className="border-b border-[var(--line-subtle)] pb-5">
            <CardTitle className="text-[18px]">
              Como esta area vai operar
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5 text-[13px] leading-[1.6] text-[var(--fg-tertiary)]">
            <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] px-4 py-4">
              Templates globais vao nascer fora de qualquer company e servir
              como ponto de partida para agentes reutilizaveis.
            </div>
            <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] px-4 py-4">
              A publicacao precisara respeitar o fluxo de versao ativa do
              dominio de agentes, sem expor complexidade desnecessaria para o
              operador.
            </div>
            <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] px-4 py-4">
              Ate o backend real existir, esta pagina funciona como contrato
              visual e operacional do que a plataforma vai administrar depois.
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
