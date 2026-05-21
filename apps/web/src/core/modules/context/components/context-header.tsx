import { RefreshCcw } from 'lucide-react';
import { PermissionGate } from 'src/core/shared/components/permission-gate';
import { Button } from 'src/core/shared/components/ui/button';
import type { ContextArtifact } from '../hooks/use-context-sources';
import { ContextSyncBadge } from './context-sync-badge';

function formatSyncDate(value: string | null) {
  if (!value) return 'Ainda sem sincronização concluída';
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
}

type Props = {
  artifact: ContextArtifact;
  onSync: () => void;
  isSyncing: boolean;
};

export function ContextHeader({ artifact, onSync, isSyncing }: Props) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
          Workspace
        </p>
        <h1 className="mt-1 text-[28px] font-medium tracking-[-0.02em] text-[var(--fg-primary)]">
          Contexto
        </h1>
        <p className="mt-2 max-w-3xl text-[14px] text-[var(--fg-tertiary)]">
          Centralize as fontes de contexto da empresa e acompanhe os materiais de apoio que ainda
          alimentam a operação. A camada visual e de assets de marca migra para Design System.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-[var(--fg-tertiary)]">
          <ContextSyncBadge status={artifact?.syncStatus ?? 'idle'} />
          <span>{formatSyncDate(artifact?.syncedAt ?? null)}</span>
          {artifact?.sourceCount !== undefined && artifact.sourceCount > 0 && (
            <span className="text-[var(--fg-quaternary)]">
              · {artifact.sourceCount} fonte{artifact.sourceCount !== 1 ? 's' : ''} aprovada
              {artifact.sourceCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <PermissionGate permission="context.publish">
        <Button onClick={onSync} disabled={isSyncing}>
          <RefreshCcw className="size-4" />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar contexto para IA'}
        </Button>
      </PermissionGate>
    </div>
  );
}
