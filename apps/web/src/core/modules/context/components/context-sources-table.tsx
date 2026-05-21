'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { parseAsInteger, parseAsString, useQueryState, useQueryStates } from 'nuqs';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileText,
  Globe,
  Loader2,
  MoreHorizontal,
  PenLine,
  Plus,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { PermissionGate } from 'src/core/shared/components/permission-gate';
import { Badge } from 'src/core/shared/components/ui/badge';
import { Button } from 'src/core/shared/components/ui/button';
import { DataTable, type DataTableFilter } from 'src/core/shared/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'src/core/shared/components/ui/dropdown-menu';
import { AddContextSourceDialog } from './add-context-source-dialog';
import {
  useDeleteContextSource,
  useReviewContextSource,
  type ContextPipelineStatus,
  type ContextSource,
  type ContextSourceKind,
} from '../hooks/use-context-sources';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const KIND_ICON: Record<ContextSourceKind, React.ElementType> = {
  file: FileText,
  url: Globe,
  manual: PenLine,
};

const KIND_LABEL: Record<ContextSourceKind, string> = {
  file: 'Arquivo',
  url: 'URL',
  manual: 'Manual',
};

const STATUS_CONFIG: Record<
  ContextPipelineStatus,
  { label: string; variant: 'secondary' | 'success' | 'destructive' | 'warning'; animate: boolean }
> = {
  pending: { label: 'Aguardando', variant: 'secondary', animate: true },
  ingesting: { label: 'Ingestão', variant: 'secondary', animate: true },
  extracting: { label: 'Extraindo', variant: 'secondary', animate: true },
  review: { label: 'Em revisão', variant: 'warning', animate: false },
  approved: { label: 'Aprovado', variant: 'success', animate: false },
  rejected: { label: 'Rejeitado', variant: 'secondary', animate: false },
  error: { label: 'Erro', variant: 'destructive', animate: false },
};

const STATUS_ICON: Record<ContextPipelineStatus, React.ElementType> = {
  pending: Loader2,
  ingesting: Loader2,
  extracting: Loader2,
  review: AlertCircle,
  approved: CheckCircle2,
  rejected: XCircle,
  error: AlertCircle,
};

type Props = { sources: ContextSource[]; orgId: string | null };

export function ContextSourcesTable({ sources, orgId }: Props) {
  const [dialogKind, setDialogKind] = useState<ContextSourceKind | null>(null);
  const [detailSource, setDetailSource] = useState<ContextSource | null>(null);
  const deleteSource = useDeleteContextSource(orgId);
  const reviewSource = useReviewContextSource(orgId);
  const [sourcesPage, setSourcesPage] = useQueryState('sourcesPage', parseAsInteger.withDefault(0));
  const [sourceFilters, setSourceFilters] = useQueryStates({
    pipelineStatus: parseAsString.withDefault('all'),
    sourceKind: parseAsString.withDefault('all'),
  });

  const columns: ColumnDef<ContextSource>[] = [
    {
      id: 'source',
      header: 'Fonte',
      enableSorting: true,
      sortingFn: (a, b) => a.original.title.localeCompare(b.original.title),
      meta: { label: 'Fonte' },
      cell: ({ row }) => {
        const KindIcon = KIND_ICON[row.original.sourceKind];
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-md)] bg-[var(--bg-sunken)]">
              <KindIcon className="size-4 text-[var(--fg-tertiary)]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                {row.original.title}
              </p>
              <p className="truncate text-[12px] text-[var(--fg-tertiary)]">
                {row.original.category ?? KIND_LABEL[row.original.sourceKind]}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'pipelineStatus',
      header: 'Pipeline',
      enableSorting: true,
      sortingFn: (a, b) =>
        a.original.pipelineStatus.localeCompare(b.original.pipelineStatus),
      meta: { label: 'Pipeline' },
      cell: ({ row }) => {
        const { pipelineStatus } = row.original;
        const config = STATUS_CONFIG[pipelineStatus];
        const Icon = STATUS_ICON[pipelineStatus];
        return (
          <Badge variant={config.variant} className="gap-1">
            <Icon className={`size-3 ${config.animate ? 'animate-spin' : ''}`} />
            {config.label}
          </Badge>
        );
      },
    },
    {
      id: 'sourceKind',
      header: 'Tipo',
      enableSorting: true,
      sortingFn: (a, b) => a.original.sourceKind.localeCompare(b.original.sourceKind),
      meta: { label: 'Tipo' },
      cell: ({ row }) => (
        <span className="text-[12px] text-[var(--fg-secondary)]">
          {KIND_LABEL[row.original.sourceKind]}
        </span>
      ),
    },
    {
      id: 'tags',
      header: 'Tags',
      enableSorting: false,
      meta: { label: 'Tags' },
      cell: ({ row }) => {
        const { tags } = row.original;
        if (!tags.length) return <span className="text-[12px] text-[var(--fg-quaternary)]">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="px-1.5 py-0 text-[11px]">
                {tag}
              </Badge>
            ))}
            {tags.length > 2 && (
              <span className="text-[11px] text-[var(--fg-tertiary)]">+{tags.length - 2}</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'updatedAt',
      header: 'Atualizado',
      enableSorting: true,
      sortingFn: (a, b) =>
        new Date(a.original.updatedAt).getTime() - new Date(b.original.updatedAt).getTime(),
      meta: { label: 'Atualizado' },
      cell: ({ row }) => (
        <span className="font-mono text-[12px] tabular-nums text-[var(--fg-tertiary)]">
          {formatDate(row.original.updatedAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDetailSource(row.original)}>
                Ver detalhes
              </DropdownMenuItem>
              {row.original.pipelineStatus === 'review' && (
                <PermissionGate permission="context.review">
                  <DropdownMenuItem
                    onClick={() =>
                      reviewSource.mutate({ sourceId: row.original.id, decision: 'approve' })
                    }
                  >
                    <CheckCircle2 className="size-4" />
                    Aprovar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      reviewSource.mutate({ sourceId: row.original.id, decision: 'reject' })
                    }
                  >
                    <XCircle className="size-4" />
                    Rejeitar
                  </DropdownMenuItem>
                </PermissionGate>
              )}
              <PermissionGate permission="context.delete">
                <DropdownMenuItem
                  className="text-[var(--danger)]"
                  onClick={() => deleteSource.mutate(row.original.id)}
                >
                  <Trash2 className="size-4" />
                  Remover
                </DropdownMenuItem>
              </PermissionGate>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const filters: DataTableFilter<ContextSource>[] = [
    {
      id: 'pipelineStatus',
      label: 'Pipeline',
      options: [
        { value: 'review', label: 'Em revisão', predicate: (r) => r.pipelineStatus === 'review' },
        { value: 'approved', label: 'Aprovados', predicate: (r) => r.pipelineStatus === 'approved' },
        { value: 'rejected', label: 'Rejeitados', predicate: (r) => r.pipelineStatus === 'rejected' },
        {
          value: 'processing',
          label: 'Processando',
          predicate: (r) => ['pending', 'ingesting', 'extracting'].includes(r.pipelineStatus),
        },
        { value: 'error', label: 'Erro', predicate: (r) => r.pipelineStatus === 'error' },
      ],
    },
    {
      id: 'sourceKind',
      label: 'Tipo',
      options: [
        { value: 'file', label: 'Arquivos', predicate: (r) => r.sourceKind === 'file' },
        { value: 'url', label: 'URLs', predicate: (r) => r.sourceKind === 'url' },
        { value: 'manual', label: 'Manual', predicate: (r) => r.sourceKind === 'manual' },
      ],
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={sources}
        getRowId={(source) => source.id}
        filters={filters}
        filterValues={sourceFilters as Record<string, string>}
        onFilterValuesChange={(v) => void setSourceFilters(v as { pipelineStatus: string; sourceKind: string })}
        enablePagination
        pageIndex={sourcesPage}
        onPageIndexChange={(p) => void setSourcesPage(p)}
        containerClassName="border-[var(--line-subtle)] shadow-[0_0_0_1px_var(--line-subtle)]"
        toolbarEnd={
          <PermissionGate permission="context.create">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  Adicionar fonte
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setDialogKind('file')}>
                  <UploadCloud className="size-4" />
                  Arquivo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDialogKind('url')}>
                  <Globe className="size-4" />
                  URL
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDialogKind('manual')}>
                  <PenLine className="size-4" />
                  Manual
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </PermissionGate>
        }
        emptyState={{
          icon: FileText,
          title: 'Nenhuma fonte de contexto',
          description:
            'Adicione arquivos, URLs ou texto manual para enriquecer o contexto oficial da empresa.',
          action: (
            <PermissionGate permission="context.create">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus className="size-4" />
                    Adicionar primeira fonte
                    <ChevronDown className="size-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-44">
                  <DropdownMenuItem onClick={() => setDialogKind('file')}>
                    <UploadCloud className="size-4" />
                    Arquivo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDialogKind('url')}>
                    <Globe className="size-4" />
                    URL
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDialogKind('manual')}>
                    <PenLine className="size-4" />
                    Manual
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </PermissionGate>
          ),
        }}
        bulkActions={[
          {
            id: 'approve',
            label: 'Aprovar',
            icon: CheckCircle2,
            permission: 'context.review',
            onClick: async (rows) => {
              await Promise.all(
                rows
                  .filter((r) => r.pipelineStatus === 'review')
                  .map((r) => reviewSource.mutateAsync({ sourceId: r.id, decision: 'approve' })),
              );
            },
          },
          {
            id: 'delete',
            label: 'Excluir',
            icon: Trash2,
            variant: 'destructive',
            permission: 'context.delete',
            onClick: async (rows) => {
              await Promise.all(rows.map((r) => deleteSource.mutateAsync(r.id)));
            },
          },
        ]}
        exportOptions={{
          fileName: 'context-sources',
          title: 'Fontes de contexto',
          columns: [
            { id: 'title', label: 'Título', value: (r) => r.title },
            { id: 'sourceKind', label: 'Tipo', value: (r) => KIND_LABEL[r.sourceKind] },
            { id: 'category', label: 'Categoria', value: (r) => r.category ?? '' },
            {
              id: 'pipelineStatus',
              label: 'Pipeline',
              value: (r) => STATUS_CONFIG[r.pipelineStatus].label,
            },
            { id: 'tags', label: 'Tags', value: (r) => r.tags.join(', ') },
            {
              id: 'updatedAt',
              label: 'Atualizado',
              value: (r) => formatDate(r.updatedAt),
            },
          ],
        }}
      />

      <AddContextSourceDialog orgId={orgId} kind={dialogKind} onOpenChange={(open) => { if (!open) setDialogKind(null); }} />

      {/* detail sheet inline */}
      {detailSource && (
        <ContextDetailInline
          source={detailSource}
          orgId={orgId}
          onClose={() => setDetailSource(null)}
        />
      )}
    </>
  );
}

// ─── Inline detail sheet importado dinamicamente para evitar circular dep ────

import { ContextSourceDetailSheet } from './context-source-detail-sheet';

function ContextDetailInline({
  source,
  orgId,
  onClose,
}: {
  source: ContextSource;
  orgId: string | null;
  onClose: () => void;
}) {
  return <ContextSourceDetailSheet source={source} orgId={orgId} onClose={onClose} />;
}
