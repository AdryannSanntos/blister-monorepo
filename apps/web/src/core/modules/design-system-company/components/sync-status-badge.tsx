import { Badge } from 'src/core/shared/components/ui/badge';
import type { DesignArtifactSyncStatus } from '../hooks/use-company-design-system';

const labels: Record<DesignArtifactSyncStatus, string> = {
  idle: 'Nao sincronizado',
  pending: 'Sincronizando IA',
  synced: 'Sincronizado',
  failed: 'Falhou',
};

export function SyncStatusBadge({ status }: { status: DesignArtifactSyncStatus }) {
  const variant = status === 'synced' ? 'success' : status === 'failed' ? 'destructive' : 'secondary';
  return <Badge variant={variant}>{labels[status]}</Badge>;
}
