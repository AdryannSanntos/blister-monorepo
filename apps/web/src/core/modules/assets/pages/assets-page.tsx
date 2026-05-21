'use client';

import type { ColumnDef, RowSelectionState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import {
  Archive,
  ChevronRight,
  FileText,
  FolderOpen,
  ImageIcon,
  Link2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import type { Dispatch, SetStateAction } from 'react';
import { useDeferredValue, useState } from 'react';
import { AddAssetDialog } from 'src/core/modules/assets/components/add-asset-dialog';
import { AssetDetailSheet } from 'src/core/modules/assets/components/asset-detail-sheet';
import {
  type AssetRoleFilter,
  type ContextAssetStatus,
  type OperationalAssetStatus,
  type WorkspaceAsset,
  useAssets,
  useBulkUpdateAssets,
} from 'src/core/modules/assets/hooks/use-assets';
import { useAbility } from 'src/core/modules/organization/hooks/use-ability';
import { useActiveOrganization } from 'src/core/modules/organization/hooks/use-active-organization';
import { PermissionGate } from 'src/core/shared/components/permission-gate';
import { Badge } from 'src/core/shared/components/ui/badge';
import { Button } from 'src/core/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'src/core/shared/components/ui/card';
import { Checkbox } from 'src/core/shared/components/ui/checkbox';
import { Input } from 'src/core/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/core/shared/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'src/core/shared/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'src/core/shared/components/ui/tabs';

const categoryLabels: Record<string, string> = {
  brand: 'Marca',
  commercial: 'Comercial',
  institutional: 'Institucional',
  'published-content': 'Conteúdo publicado',
  'visual-reference': 'Referência visual',
  page: 'Página',
  campaign: 'Campanha',
  other: 'Outro',
};

function statusLabel(status: string | null) {
  if (!status) return 'Sem status';
  const labels: Record<string, string> = {
    uploaded: 'Enviado',
    processed: 'Processado',
    suggested: 'Sugerido',
    approved: 'Aprovado',
    discarded: 'Descartado',
    active: 'Ativo',
    archived: 'Arquivado',
    obsolete: 'Obsoleto',
  };

  return labels[status] ?? status;
}

function statusVariant(status: string | null) {
  if (status === 'approved' || status === 'active') return 'success' as const;
  if (status === 'discarded' || status === 'obsolete') return 'destructive' as const;
  return 'secondary' as const;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function roleLabel(asset: WorkspaceAsset) {
  if (asset.contextRole && asset.operationalRole) return 'Contexto + Operacional';
  if (asset.contextRole) return 'Contexto';
  if (asset.operationalRole) return 'Operacional';
  return 'Sem papel';
}

function sourceIcon(asset: WorkspaceAsset) {
  if (asset.sourceKind === 'url') return <Link2 className="size-4 text-[var(--fg-tertiary)]" />;
  if (asset.visibleType === 'image') {
    return <ImageIcon className="size-4 text-[var(--fg-tertiary)]" />;
  }
  return <FileText className="size-4 text-[var(--fg-tertiary)]" />;
}

type AssetsTableProps = {
  assets: WorkspaceAsset[];
  selected: RowSelectionState;
  onSelectedChange: Dispatch<SetStateAction<RowSelectionState>>;
  onOpenDetail: (assetId: string) => void;
};

function AssetsTable({ assets, selected, onSelectedChange, onOpenDetail }: AssetsTableProps) {
  const columns: ColumnDef<WorkspaceAsset>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
          aria-label="Selecionar todos os assets"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
          aria-label={`Selecionar ${row.original.title}`}
          onClick={(event) => event.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'title',
      header: 'Asset',
      cell: ({ row }) => {
        const asset = row.original;
        return (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-[var(--r-sm)] bg-[var(--bg-sunken)] p-2">
              {sourceIcon(asset)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                {asset.title}
              </p>
              <p className="truncate text-[12px] text-[var(--fg-tertiary)]">
                {asset.description || asset.fileName || asset.sourceUrl || 'Sem descrição'}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'category',
      header: 'Categoria',
      cell: ({ row }) => {
        const asset = row.original;
        return (
          <div className="space-y-1">
            <p className="text-[12px] text-[var(--fg-secondary)]">
              {asset.visibleType || 'Sem tipo'}
            </p>
            <Badge variant="secondary">
              {categoryLabels[asset.visibleCategory ?? ''] ??
                asset.visibleCategory ??
                'Sem categoria'}
            </Badge>
          </div>
        );
      },
    },
    {
      id: 'role',
      header: 'Papel',
      cell: ({ row }) => <Badge variant="secondary">{roleLabel(row.original)}</Badge>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const asset = row.original;
        const status = asset.contextRole ? asset.contextStatus : asset.operationalStatus;
        return <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>;
      },
    },
    {
      id: 'relations',
      header: 'Relações',
      cell: ({ row }) => {
        const relations = row.original.relations.slice(0, 2);
        const overflow = row.original.relations.length - relations.length;
        return relations.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {relations.map((relation) => (
              <Badge key={relation.id} variant="secondary">
                {relation.value}
              </Badge>
            ))}
            {overflow > 0 ? <Badge variant="secondary">+{overflow}</Badge> : null}
          </div>
        ) : (
          <span className="text-[12px] text-[var(--fg-tertiary)]">Sem relações</span>
        );
      },
    },
    {
      id: 'updatedAt',
      header: 'Atualizado',
      cell: ({ row }) => (
        <span className="font-mono text-[12px] tabular-nums text-[var(--fg-tertiary)]">
          {formatDate(row.original.updatedAt)}
        </span>
      ),
    },
  ];

  const table = useReactTable({
    data: assets,
    columns,
    state: { rowSelection: selected },
    onRowSelectionChange: onSelectedChange,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
  });

  return (
    <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => onOpenDetail(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    onClick={
                      cell.column.id === 'select' ? (event) => event.stopPropagation() : undefined
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-[var(--fg-tertiary)]"
              >
                Nenhum asset encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

type SummaryCardsProps = {
  activeTab: AssetRoleFilter;
  assets: WorkspaceAsset[];
};

function SummaryCards({ activeTab, assets }: SummaryCardsProps) {
  if (activeTab === 'context') {
    const counts = {
      uploaded: assets.filter((asset) => asset.contextStatus === 'uploaded').length,
      processed: assets.filter((asset) => asset.contextStatus === 'processed').length,
      suggested: assets.filter((asset) => asset.contextStatus === 'suggested').length,
      approved: assets.filter((asset) => asset.contextStatus === 'approved').length,
    };

    return (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Enviados', value: counts.uploaded, copy: 'Aguardando pipeline inicial' },
          { label: 'Processados', value: counts.processed, copy: 'Prontos para sugestão' },
          { label: 'Sugeridos', value: counts.suggested, copy: 'Pedem revisão humana' },
          { label: 'Aprovados', value: counts.approved, copy: 'Já fortalecem o contexto' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-medium text-[var(--fg-primary)]">{item.value}</p>
              <p className="mt-1 text-[12px] text-[var(--fg-tertiary)]">{item.copy}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    );
  }

  const counts = {
    active: assets.filter((asset) => asset.operationalStatus === 'active').length,
    archived: assets.filter((asset) => asset.operationalStatus === 'archived').length,
    obsolete: assets.filter((asset) => asset.operationalStatus === 'obsolete').length,
    reusable: assets.filter((asset) => asset.operationalRole && asset.relations.length > 0).length,
  };

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: 'Ativos', value: counts.active, copy: 'Disponíveis para reutilização' },
        { label: 'Arquivados', value: counts.archived, copy: 'Histórico preservado' },
        { label: 'Obsoletos', value: counts.obsolete, copy: 'Não sugerir por padrão' },
        { label: 'Prontos para IA', value: counts.reusable, copy: 'Com relações úteis de negócio' },
      ].map((item) => (
        <Card key={item.label}>
          <CardContent className="px-5 py-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-medium text-[var(--fg-primary)]">{item.value}</p>
            <p className="mt-1 text-[12px] text-[var(--fg-tertiary)]">{item.copy}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function EmptyPermissionState() {
  return (
    <Card>
      <CardHeader className="p-6">
        <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
          Você não tem acesso a esta biblioteca
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0 text-[14px] text-[var(--fg-secondary)]">
        O papel padrão de member não acessa `Assets`. Peça a um owner ou admin para ajustar seu
        acesso.
      </CardContent>
    </Card>
  );
}

export function AssetsPage() {
  const { activeOrgId } = useActiveOrganization();
  const { can, isLoading: isAbilityLoading } = useAbility();
  const canReadAssets = can('read', 'Asset');
  const [activeTab, setActiveTab] = useState<AssetRoleFilter>('context');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [contextStatusFilter, setContextStatusFilter] = useState<ContextAssetStatus | 'all'>('all');
  const [operationalStatusFilter, setOperationalStatusFilter] = useState<
    OperationalAssetStatus | 'all'
  >('all');
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [contextDialogOpen, setContextDialogOpen] = useState(false);
  const [operationalDialogOpen, setOperationalDialogOpen] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const bulkUpdateAssets = useBulkUpdateAssets(activeOrgId);

  const { data: assets = [], isLoading } = useAssets(activeOrgId, {
    role: activeTab,
    search: deferredSearch || undefined,
    contextStatus:
      activeTab === 'context' && contextStatusFilter !== 'all' ? contextStatusFilter : undefined,
    operationalStatus:
      activeTab === 'operational' && operationalStatusFilter !== 'all'
        ? operationalStatusFilter
        : undefined,
  });

  const filteredAssets = assets.filter((asset) => {
    if (categoryFilter === 'all') return true;
    return asset.visibleCategory === categoryFilter;
  });

  const selectedAssetIds = Object.entries(selectedRows)
    .filter(([, value]) => value)
    .map(([rowId]) => filteredAssets[Number(rowId)]?.id)
    .filter(Boolean) as string[];

  const categoryOptions = Array.from(
    new Set(filteredAssets.map((asset) => asset.visibleCategory).filter(Boolean)),
  );

  async function handleBulkAction(
    action: Parameters<typeof bulkUpdateAssets.mutateAsync>[0]['action'],
  ) {
    if (selectedAssetIds.length === 0) return;
    await bulkUpdateAssets.mutateAsync({ assetIds: selectedAssetIds, action });
    setSelectedRows({});
  }

  if (!activeOrgId) {
    return null;
  }

  if (!isAbilityLoading && !canReadAssets) {
    return <EmptyPermissionState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
            Workspace
          </p>
          <h1 className="mt-1 text-[28px] font-medium tracking-[-0.02em] text-[var(--fg-primary)]">
            Assets
          </h1>
          <p className="mt-2 max-w-3xl text-[14px] text-[var(--fg-tertiary)]">
            Organize a biblioteca da empresa em duas camadas claras: fontes de contexto e materiais
            operacionais reutilizáveis.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <PermissionGate permission="asset.create">
            <Button variant="outline" onClick={() => setContextDialogOpen(true)}>
              <Plus className="size-4" />
              Adicionar fonte de contexto
            </Button>
          </PermissionGate>
          <PermissionGate permission="asset.create">
            <Button onClick={() => setOperationalDialogOpen(true)}>
              <FolderOpen className="size-4" />
              Adicionar asset operacional
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as AssetRoleFilter);
          setSelectedRows({});
          setCategoryFilter('all');
        }}
      >
        <TabsList variant="underline">
          <TabsTrigger value="context">Contexto</TabsTrigger>
          <TabsTrigger value="operational">Operacional</TabsTrigger>
        </TabsList>

        <SummaryCards activeTab={activeTab} assets={assets} />

        <TabsContent value="context" className="space-y-6">
          <Card>
            <CardContent className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[13px] text-[var(--fg-secondary)]">
                  Use esta aba para cadastrar fontes que ajudam a enriquecer o contexto oficial da
                  empresa. O sistema opera o pipeline, mas a aprovação continua humana.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={contextStatusFilter}
                  onValueChange={(value) =>
                    setContextStatusFilter(value as ContextAssetStatus | 'all')
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status do contexto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="uploaded">Enviado</SelectItem>
                    <SelectItem value="processed">Processado</SelectItem>
                    <SelectItem value="suggested">Sugerido</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="discarded">Descartado</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/onboarding">
                    Abrir Brain
                    <ChevronRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operational" className="space-y-6">
          <Card>
            <CardContent className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[13px] text-[var(--fg-secondary)]">
                  Reúna materiais reutilizáveis para futuras gerações de post, copy, visual e
                  páginas. A IA pode sugeri-los depois com base em encaixe semântico e uso real.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={operationalStatusFilter}
                  onValueChange={(value) =>
                    setOperationalStatusFilter(value as OperationalAssetStatus | 'all')
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status operacional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                    <SelectItem value="obsolete">Obsoleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="space-y-4 px-5 py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-wrap gap-2">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por título, descrição ou origem..."
                className="max-w-md"
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Categoria visível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category ?? 'other'}>
                      {categoryLabels[category ?? ''] ?? category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAssetIds.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] px-3 py-2">
                <span className="text-[12px] text-[var(--fg-secondary)]">
                  {selectedAssetIds.length} selecionado(s)
                </span>

                {activeTab === 'context' ? (
                  <>
                    <PermissionGate permission="asset.context.review">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBulkAction('approve_context')}
                      >
                        <Sparkles className="size-4" />
                        Aprovar
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="asset.context.review">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBulkAction('discard_context')}
                      >
                        <Trash2 className="size-4" />
                        Descartar
                      </Button>
                    </PermissionGate>
                  </>
                ) : (
                  <>
                    <PermissionGate permission="asset.archive">
                      <Button variant="ghost" size="sm" onClick={() => handleBulkAction('archive')}>
                        <Archive className="size-4" />
                        Arquivar
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="asset.archive">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBulkAction('mark_obsolete')}
                      >
                        <Trash2 className="size-4" />
                        Marcar obsoleto
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="asset.context.review">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBulkAction('promote_to_context')}
                      >
                        <Sparkles className="size-4" />
                        Promover para contexto
                      </Button>
                    </PermissionGate>
                  </>
                )}
              </div>
            ) : null}
          </div>

          {categoryOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={categoryFilter === 'all' ? 'outline' : 'ghost'}
                size="sm"
                onClick={() => setCategoryFilter('all')}
              >
                Todas
              </Button>
              {categoryOptions.map((category) => (
                <Button
                  key={category}
                  variant={categoryFilter === category ? 'outline' : 'ghost'}
                  size="sm"
                  onClick={() => setCategoryFilter(category ?? 'all')}
                >
                  {categoryLabels[category ?? ''] ?? category}
                </Button>
              ))}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : (
            <AssetsTable
              assets={filteredAssets}
              selected={selectedRows}
              onSelectedChange={setSelectedRows}
              onOpenDetail={setSelectedAssetId}
            />
          )}
        </CardContent>
      </Card>

      <AddAssetDialog
        mode="context"
        orgId={activeOrgId}
        open={contextDialogOpen}
        onOpenChange={setContextDialogOpen}
      />
      <AddAssetDialog
        mode="operational"
        orgId={activeOrgId}
        open={operationalDialogOpen}
        onOpenChange={setOperationalDialogOpen}
      />
      <AssetDetailSheet
        orgId={activeOrgId}
        assetId={selectedAssetId}
        open={Boolean(selectedAssetId)}
        onOpenChange={(open) => {
          if (!open) setSelectedAssetId(null);
        }}
      />
    </div>
  );
}
