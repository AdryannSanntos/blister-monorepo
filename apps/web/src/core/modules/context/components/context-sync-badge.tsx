import { Badge } from 'src/core/shared/components/ui/badge';
import type { ContextArtifact } from '../hooks/use-context-sources';

type SyncStatus = NonNullable<ContextArtifact>['syncStatus'];

const labels: Record<SyncStatus, string> = {
  idle: 'Não sincronizado',
  syncing: 'Sincronizando IA',
  synced: 'Sincronizado',
  error: 'Falhou',
};

export function ContextSyncBadge({ status }: { status: SyncStatus }) {
  const variant =
    status === 'synced' ? 'success' : status === 'error' ? 'destructive' : 'secondary';
  return <Badge variant={variant}>{labels[status]}</Badge>;
}
