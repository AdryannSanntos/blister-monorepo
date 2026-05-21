'use client';

import {
  Archive,
  ArrowUpRight,
  CheckCheck,
  FileText,
  ImageIcon,
  Link2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAsset, useUpdateAsset } from 'src/core/modules/assets/hooks/use-assets';
import { PermissionGate } from 'src/core/shared/components/permission-gate';
import { Badge } from 'src/core/shared/components/ui/badge';
import { Button } from 'src/core/shared/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/core/shared/components/ui/sheet';

type AssetDetailSheetProps = {
  orgId: string;
  assetId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function relationLabel(kind: string) {
  const labels: Record<string, string> = {
    campaign: 'Campanha',
    channel: 'Canal',
    product: 'Produto',
    page: 'Página',
    output: 'Output',
  };

  return labels[kind] ?? kind;
}

function statusTone(status: string | null) {
  if (status === 'approved' || status === 'active') return 'success' as const;
  if (status === 'discarded' || status === 'obsolete') return 'destructive' as const;
  return 'secondary' as const;
}

export function AssetDetailSheet({ orgId, assetId, open, onOpenChange }: AssetDetailSheetProps) {
  const { data: asset, isLoading } = useAsset(orgId, assetId);
  const updateAsset = useUpdateAsset(orgId);

  async function handleAction(
    payload:
      | { contextStatus: 'approved' | 'discarded' }
      | { operationalStatus: 'archived' }
      | { contextRole: true },
  ) {
    if (!assetId) return;
    await updateAsset.mutateAsync({ assetId, ...payload });
  }

  const isImage = asset?.mimeType?.startsWith('image/') || asset?.visibleType === 'image';
  const canPreviewExternally = Boolean(asset?.sourceUrl);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[540px] bg-[var(--bg-base)] p-0">
        <SheetHeader className="gap-2 border-b border-[var(--line-subtle)] p-6">
          <SheetTitle className="text-[18px] font-medium text-[var(--fg-primary)]">
            {asset?.title ?? 'Detalhes do asset'}
          </SheetTitle>
          <SheetDescription className="text-[13px] text-[var(--fg-tertiary)]">
            Visualize o material e gerencie apenas a camada de produto visível deste asset.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading || !asset ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-4">
                {isImage && asset.sourceUrl ? (
                  <img
                    src={asset.sourceUrl}
                    alt={asset.title}
                    className="h-[220px] w-full rounded-[var(--r-md)] object-cover"
                  />
                ) : (
                  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[var(--r-md)] border border-dashed border-[var(--line-default)] bg-[var(--bg-sunken)] text-center">
                    {asset.sourceKind === 'url' ? (
                      <Link2 className="size-8 text-[var(--fg-tertiary)]" />
                    ) : asset.visibleType === 'image' ? (
                      <ImageIcon className="size-8 text-[var(--fg-tertiary)]" />
                    ) : (
                      <FileText className="size-8 text-[var(--fg-tertiary)]" />
                    )}
                    <div>
                      <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                        {asset.fileName ?? asset.visibleType ?? 'Asset'}
                      </p>
                      <p className="text-[12px] text-[var(--fg-tertiary)]">
                        {asset.sourceKind === 'url'
                          ? 'Fonte cadastrada por URL'
                          : (asset.mimeType ?? 'Arquivo enviado')}
                      </p>
                    </div>
                  </div>
                )}

                {canPreviewExternally ? (
                  <div className="mt-4 flex justify-end">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={asset.sourceUrl ?? undefined} target="_blank" rel="noreferrer">
                        Abrir origem
                        <ArrowUpRight className="size-3.5" />
                      </a>
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
                <div className="flex flex-wrap gap-2">
                  {asset.contextRole ? <Badge variant="secondary">Contexto</Badge> : null}
                  {asset.operationalRole ? <Badge variant="secondary">Operacional</Badge> : null}
                  {asset.contextStatus ? (
                    <Badge variant={statusTone(asset.contextStatus)}>{asset.contextStatus}</Badge>
                  ) : null}
                  {asset.operationalStatus ? (
                    <Badge variant={statusTone(asset.operationalStatus)}>
                      {asset.operationalStatus}
                    </Badge>
                  ) : null}
                </div>

                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                    Descrição
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
                    {asset.description || 'Sem descrição cadastrada.'}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                      Tipo visível
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
                      {asset.visibleType || 'Não definido'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                      Categoria visível
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
                      {asset.visibleCategory || 'Não definida'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                    Labels visíveis
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {asset.tags.length > 0 ? (
                      asset.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[13px] text-[var(--fg-tertiary)]">Sem labels.</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                    Relações de negócio
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {asset.relations.length > 0 ? (
                      asset.relations.map((relation) => (
                        <Badge key={relation.id} variant="secondary" className="gap-1">
                          <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--fg-quaternary)]">
                            {relationLabel(relation.kind)}
                          </span>
                          <span>{relation.value}</span>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[13px] text-[var(--fg-tertiary)]">
                        Nenhuma relação cadastrada.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {asset ? (
          <SheetFooter className="border-t border-[var(--line-subtle)] p-6">
            <div className="flex flex-wrap justify-end gap-2">
              {asset.contextRole && asset.contextStatus !== 'approved' ? (
                <PermissionGate permission="asset.context.review">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={updateAsset.isPending}
                    onClick={() => handleAction({ contextStatus: 'approved' })}
                  >
                    <CheckCheck className="size-4" />
                    Aprovar contexto
                  </Button>
                </PermissionGate>
              ) : null}

              {asset.contextRole && asset.contextStatus !== 'discarded' ? (
                <PermissionGate permission="asset.context.review">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={updateAsset.isPending}
                    onClick={() => handleAction({ contextStatus: 'discarded' })}
                  >
                    <Trash2 className="size-4" />
                    Descartar do contexto
                  </Button>
                </PermissionGate>
              ) : null}

              {asset.operationalRole && asset.operationalStatus === 'active' ? (
                <PermissionGate permission="asset.archive">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={updateAsset.isPending}
                    onClick={() => handleAction({ operationalStatus: 'archived' })}
                  >
                    <Archive className="size-4" />
                    Arquivar
                  </Button>
                </PermissionGate>
              ) : null}

              {!asset.contextRole ? (
                <PermissionGate permission="asset.context.review">
                  <Button
                    size="sm"
                    disabled={updateAsset.isPending}
                    onClick={() => handleAction({ contextRole: true })}
                  >
                    <Sparkles className="size-4" />
                    Promover para contexto
                  </Button>
                </PermissionGate>
              ) : null}
            </div>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
