'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Palette, Plus } from 'lucide-react';
import { useState } from 'react';
import { PermissionGate } from 'src/core/shared/components/permission-gate';
import { Badge } from 'src/core/shared/components/ui/badge';
import { Button } from 'src/core/shared/components/ui/button';
import { DataTable, type DataTableFilter } from 'src/core/shared/components/ui/data-table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from 'src/core/shared/components/ui/dropdown-menu';
import { UpsertColorGroupDialog } from './upsert-color-group-dialog';
import { UpsertColorTokenDialog } from './upsert-color-token-dialog';
import type { DesignColorGroup, DesignColorToken } from '../hooks/use-company-design-system';
import { useCreateColorGroup, useCreateColorToken, useDeleteColorGroup, useDeleteColorToken, useUpdateColorGroup, useUpdateColorToken } from '../hooks/use-company-design-system';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ColorGroupSurfaceIcon({ colors }: { colors: DesignColorToken[] }) {
  const swatches = colors.slice(0, 4);

  return (
    <div className="grid size-10 shrink-0 grid-cols-2 gap-1 rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-sunken)] p-1.5">
      {Array.from({ length: 4 }).map((_, index) => (
        <span
          key={swatches[index]?.id ?? index}
          className="rounded-[var(--r-xs)] border border-[var(--line-subtle)] bg-[var(--bg-base)]"
          style={swatches[index] ? { backgroundColor: swatches[index].value } : undefined}
        />
      ))}
    </div>
  );
}

function getLatestColor(colors: DesignColorToken[]) {
  return [...colors].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
}

export function ColorGroupsTable({ groups, orgId }: { groups: DesignColorGroup[]; orgId: string }) {
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DesignColorGroup | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [editingToken, setEditingToken] = useState<DesignColorToken | null>(null);
  const [tokenTemplate, setTokenTemplate] = useState<DesignColorToken | null>(null);
  const createGroup = useCreateColorGroup(orgId);
  const updateGroup = useUpdateColorGroup(orgId);
  const deleteGroup = useDeleteColorGroup(orgId);
  const createToken = useCreateColorToken(orgId);
  const updateToken = useUpdateColorToken(orgId);
  const deleteToken = useDeleteColorToken(orgId);

  const columns: ColumnDef<DesignColorGroup>[] = [
    { id: 'name', header: 'Grupo', enableSorting: true, sortingFn: (a, b) => a.original.name.localeCompare(b.original.name), cell: ({ row }) => <div className="flex min-w-0 items-center gap-3"><ColorGroupSurfaceIcon colors={row.original.colors} /><div className="min-w-0"><p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">{row.original.name}</p><p className="truncate text-[12px] text-[var(--fg-tertiary)]">{row.original.description ?? 'Sem descricao'}</p></div></div> },
    { id: 'colors', header: 'Cores', cell: ({ row }) => <div className="flex flex-wrap gap-1.5">{row.original.colors.slice(0, 5).map((color) => <Badge key={color.id} variant="secondary"><span className="mr-1.5 size-2 rounded-full border border-[var(--line-default)]" style={{ backgroundColor: color.value }} />{color.name}</Badge>)}{row.original.colors.length > 5 ? <Badge variant="secondary">+{row.original.colors.length - 5}</Badge> : null}</div> },
    { id: 'count', header: 'Qtd.', enableSorting: true, sortingFn: (a, b) => a.original.colors.length - b.original.colors.length, cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.colors.length}</span> },
    { id: 'updatedAt', header: 'Atualizado', enableSorting: true, sortingFn: (a, b) => new Date(a.original.updatedAt).getTime() - new Date(b.original.updatedAt).getTime(), cell: ({ row }) => <span className="font-mono text-[12px] tabular-nums text-[var(--fg-tertiary)]">{formatDate(row.original.updatedAt)}</span> },
    { id: 'actions', header: '', cell: ({ row }) => <div className="flex justify-end"><PermissionGate permission="design-system.update"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setActiveGroupId(row.original.id); setEditingToken(null); setTokenTemplate(getLatestColor(row.original.colors)); setTokenDialogOpen(true); }}>Adicionar cor</DropdownMenuItem><DropdownMenuItem onClick={() => { setEditingGroup(row.original); setGroupDialogOpen(true); }}>Editar grupo</DropdownMenuItem><DropdownMenuItem className="text-[var(--danger)]" onClick={() => deleteGroup.mutate(row.original.id)}>Remover grupo</DropdownMenuItem></DropdownMenuContent></DropdownMenu></PermissionGate></div> },
  ];
  const filters: DataTableFilter<DesignColorGroup>[] = [
    { id: 'content', label: 'Conteudo', options: [{ value: 'with-colors', label: 'Com cores', predicate: (group) => group.colors.length > 0 }, { value: 'empty', label: 'Sem cores', predicate: (group) => group.colors.length === 0 }] },
    { id: 'size', label: 'Tamanho', options: [{ value: 'one-to-three', label: '1 a 3 cores', predicate: (group) => group.colors.length >= 1 && group.colors.length <= 3 }, { value: 'four-plus', label: '4+ cores', predicate: (group) => group.colors.length >= 4 }] },
  ];

  return (
    <div className="space-y-4">
      <DataTable columns={columns} data={groups} getRowId={(group) => group.id} filters={filters} containerClassName="border-[var(--accent-soft-hi)] shadow-[0_0_0_1px_var(--line-subtle)]" toolbarEnd={<PermissionGate permission="design-system.update"><Button onClick={() => { setEditingGroup(null); setGroupDialogOpen(true); }}><Plus className="size-4" />Novo grupo</Button></PermissionGate>} emptyState={{ icon: Palette, title: 'Nenhum grupo de cores', description: 'Cores oficiais orientam identidade, contraste, CTAs e consistencia visual dos outputs da Workana AI.', action: <PermissionGate permission="design-system.update"><Button onClick={() => setGroupDialogOpen(true)}><Plus className="size-4" />Criar grupo</Button></PermissionGate> }} exportOptions={{ fileName: 'design-color-groups', title: 'Grupos de cores', columns: [{ id: 'name', label: 'Grupo', value: (group) => group.name }, { id: 'description', label: 'Descricao', value: (group) => group.description }, { id: 'colors', label: 'Cores', value: (group) => group.colors.map((color) => `${color.name} ${color.value}`).join(', ') }, { id: 'count', label: 'Quantidade', value: (group) => group.colors.length }, { id: 'updatedAt', label: 'Atualizado', value: (group) => formatDate(group.updatedAt) }] }} bulkActions={[{ id: 'delete', label: 'Excluir', variant: 'destructive', permission: 'design-system.update', onClick: async (rows) => { await Promise.all(rows.map((group) => deleteGroup.mutateAsync(group.id))); } }]} />
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <div key={group.id} className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-medium text-[var(--fg-primary)]">{group.name}</p>
              <PermissionGate permission="design-system.update">
                <Button variant="ghost" size="sm" onClick={() => { setActiveGroupId(group.id); setEditingToken(null); setTokenTemplate(getLatestColor(group.colors)); setTokenDialogOpen(true); }}>
                  <Plus className="size-4" />
                  Cor
                </Button>
              </PermissionGate>
            </div>
            <div className="space-y-2">
              {group.colors.map((color) => (
                <div key={color.id} className="flex items-center justify-between gap-3 rounded-[var(--r-md)] bg-[var(--bg-sunken)] px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-5 rounded-full border border-[var(--line-default)]" style={{ backgroundColor: color.value }} />
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-[var(--fg-primary)]">{color.name}</p>
                      <p className="truncate text-[11px] text-[var(--fg-tertiary)]">{color.value} · {color.semanticRole}</p>
                    </div>
                  </div>
                  <PermissionGate permission="design-system.update">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm"><MoreHorizontal className="size-3.5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setActiveGroupId(group.id); setEditingToken(color); setTokenTemplate(null); setTokenDialogOpen(true); }}>Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-[var(--danger)]" onClick={() => deleteToken.mutate(color.id)}>Remover</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PermissionGate>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <UpsertColorGroupDialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen} group={editingGroup} isPending={createGroup.isPending || updateGroup.isPending} onSubmit={async (values) => { if (editingGroup) await updateGroup.mutateAsync({ id: editingGroup.id, ...values }); else await createGroup.mutateAsync(values); setGroupDialogOpen(false); }} />
      <UpsertColorTokenDialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen} token={editingToken} template={tokenTemplate} isPending={createToken.isPending || updateToken.isPending} onSubmit={async (values) => { if (!activeGroupId) return; if (editingToken) await updateToken.mutateAsync({ id: editingToken.id, colorGroupId: activeGroupId, ...values }); else await createToken.mutateAsync({ colorGroupId: activeGroupId, ...values }); setTokenDialogOpen(false); }} />
    </div>
  );
}
