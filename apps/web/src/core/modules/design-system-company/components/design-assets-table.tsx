'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { FileImage, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PermissionGate } from 'src/core/shared/components/permission-gate';
import { Badge } from 'src/core/shared/components/ui/badge';
import { Button } from 'src/core/shared/components/ui/button';
import { DataTable, type DataTableFilter } from 'src/core/shared/components/ui/data-table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from 'src/core/shared/components/ui/dropdown-menu';
import { UploadDesignAssetDialog } from './upload-design-asset-dialog';
import { type DesignAsset, useDeleteDesignAsset } from '../hooks/use-company-design-system';

function formatDate(value: string) { return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
function formatSize(value: number) { return `${Math.max(1, Math.round(value / 1024))} KB`; }

export function DesignAssetsTable({ assets, orgId }: { assets: DesignAsset[]; orgId: string }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const deleteAsset = useDeleteDesignAsset(orgId);
  const columns: ColumnDef<DesignAsset>[] = [
    { id: 'file', header: 'Asset', enableSorting: true, sortingFn: (a, b) => a.original.fileName.localeCompare(b.original.fileName), cell: ({ row }) => <div className="flex min-w-0 items-center gap-3"><div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-md)] bg-[var(--bg-sunken)]">{row.original.publicUrl && row.original.contentType.startsWith('image/') ? <img src={row.original.publicUrl} alt={row.original.fileName} className="size-full object-cover" /> : <FileImage className="size-4 text-[var(--fg-tertiary)]" />}</div><div className="min-w-0"><p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">{row.original.fileName}</p><p className="truncate text-[12px] text-[var(--fg-tertiary)]">{row.original.description ?? 'Sem descricao'}</p></div></div> },
    { id: 'role', header: 'Papel', enableSorting: true, sortingFn: (a, b) => a.original.primaryRole.localeCompare(b.original.primaryRole), cell: ({ row }) => <Badge variant="secondary">{row.original.primaryRole}</Badge> },
    { id: 'fileType', header: 'Arquivo', enableSorting: true, sortingFn: (a, b) => a.original.contentType.localeCompare(b.original.contentType), cell: ({ row }) => <span className="text-[12px] text-[var(--fg-secondary)]">{row.original.contentType} · {formatSize(row.original.size)}</span> },
    { id: 'updatedAt', header: 'Atualizado', enableSorting: true, sortingFn: (a, b) => new Date(a.original.updatedAt).getTime() - new Date(b.original.updatedAt).getTime(), cell: ({ row }) => <span className="font-mono text-[12px] tabular-nums text-[var(--fg-tertiary)]">{formatDate(row.original.updatedAt)}</span> },
    { id: 'actions', header: '', cell: ({ row }) => <div className="flex justify-end"><PermissionGate permission="design-system.update"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="text-[var(--danger)]" onClick={() => deleteAsset.mutate(row.original.id)}><Trash2 className="size-4" />Remover</DropdownMenuItem></DropdownMenuContent></DropdownMenu></PermissionGate></div> },
  ];
  const filters: DataTableFilter<DesignAsset>[] = [
    { id: 'kind', label: 'Tipo', options: [{ value: 'image', label: 'Imagens', predicate: (asset) => asset.contentType.startsWith('image/') }, { value: 'document', label: 'Documentos', predicate: (asset) => !asset.contentType.startsWith('image/') }] },
    { id: 'role', label: 'Papel', options: Array.from(new Set(assets.map((asset) => asset.primaryRole))).map((role) => ({ value: role, label: role, predicate: (asset) => asset.primaryRole === role })) },
  ];

  return <><DataTable columns={columns} data={assets} getRowId={(asset) => asset.id} filters={filters} containerClassName="border-[var(--accent-soft-hi)] shadow-[0_0_0_1px_var(--line-subtle)]" toolbarEnd={<PermissionGate permission="design-system.update"><Button onClick={() => setUploadOpen(true)}><Plus className="size-4" />Enviar asset</Button></PermissionGate>} emptyState={{ icon: FileImage, title: 'Nenhum asset de design', description: 'Logos, referencias visuais e guias de marca ficam separados do contexto operacional e alimentam o design-system.md.', action: <PermissionGate permission="design-system.update"><Button onClick={() => setUploadOpen(true)}><Plus className="size-4" />Enviar primeiro asset</Button></PermissionGate> }} exportOptions={{ fileName: 'design-assets', title: 'Assets de design', columns: [{ id: 'fileName', label: 'Arquivo', value: (asset) => asset.fileName }, { id: 'primaryRole', label: 'Papel', value: (asset) => asset.primaryRole }, { id: 'contentType', label: 'Tipo', value: (asset) => asset.contentType }, { id: 'size', label: 'Tamanho', value: (asset) => formatSize(asset.size) }, { id: 'updatedAt', label: 'Atualizado', value: (asset) => formatDate(asset.updatedAt) }] }} bulkActions={[{ id: 'delete', label: 'Excluir', icon: Trash2, variant: 'destructive', permission: 'design-system.update', onClick: async (rows) => { await Promise.all(rows.map((asset) => deleteAsset.mutateAsync(asset.id))); } }]} /><UploadDesignAssetDialog orgId={orgId} open={uploadOpen} onOpenChange={setUploadOpen} /></>;
}
