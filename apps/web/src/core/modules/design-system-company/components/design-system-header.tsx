import { RefreshCcw } from 'lucide-react';
import { PermissionGate } from 'src/core/shared/components/permission-gate';
import { Button } from 'src/core/shared/components/ui/button';
import { SyncStatusBadge } from './sync-status-badge';
import type { CompanyDesignSystem } from '../hooks/use-company-design-system';

function formatSyncDate(value: string | null) {
  if (!value) return 'Ainda sem sincronizacao concluida';
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
}

type DesignSystemHeaderProps = {
  designSystem: CompanyDesignSystem | undefined;
  onRegenerate: () => void;
  isRegenerating: boolean;
};

export function DesignSystemHeader({ designSystem, onRegenerate, isRegenerating }: DesignSystemHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">Workspace</p>
        <h1 className="mt-1 text-[28px] font-medium tracking-[-0.02em] text-[var(--fg-primary)]">Design System</h1>
        <p className="mt-2 max-w-3xl text-[14px] text-[var(--fg-tertiary)]">
          Separe identidade visual, cores oficiais, logos e referencias esteticas do contexto operacional da empresa.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-[var(--fg-tertiary)]">
          <SyncStatusBadge status={designSystem?.artifactSyncStatus ?? 'idle'} />
          <span>{formatSyncDate(designSystem?.artifactSyncedAt ?? null)}</span>
        </div>
      </div>
      <PermissionGate permission="design-system.update">
        <Button onClick={onRegenerate} disabled={isRegenerating}>
          <RefreshCcw className="size-4" />
          {isRegenerating ? 'Regenerando...' : 'Regenerar contexto para IA'}
        </Button>
      </PermissionGate>
    </div>
  );
}
