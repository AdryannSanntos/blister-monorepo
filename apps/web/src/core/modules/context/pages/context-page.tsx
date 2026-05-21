'use client';

import { Library } from 'lucide-react';
import { useAbility } from 'src/core/modules/organization/hooks/use-ability';
import { useActiveOrganization } from 'src/core/modules/organization/hooks/use-active-organization';
import { EmptyState } from 'src/core/shared/components/ui/empty-state';
import { Skeleton } from 'src/core/shared/components/ui/skeleton';
import { ContextHeader } from '../components/context-header';
import { ContextTabs } from '../components/context-tabs';
import {
  useContextArtifact,
  useContextSources,
  useSyncContextArtifact,
} from '../hooks/use-context-sources';

function EmptyPermissionState() {
  return (
    <EmptyState
      icon={Library}
      title="Contexto indisponível"
      description="Você não tem permissão para acessar as fontes de contexto deste workspace."
    />
  );
}

export function ContextPage() {
  const { activeOrgId } = useActiveOrganization();
  const { can, isLoading: isAbilityLoading } = useAbility();
  const canRead = can('read', 'ContextSource');

  const sources = useContextSources(activeOrgId);
  const artifact = useContextArtifact(activeOrgId);
  const sync = useSyncContextArtifact(activeOrgId);

  if (!activeOrgId) return null;
  if (!isAbilityLoading && !canRead) return <EmptyPermissionState />;

  if (sources.isLoading || artifact.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ContextHeader
        artifact={artifact.data ?? null}
        onSync={() => sync.mutate()}
        isSyncing={sync.isPending || artifact.data?.syncStatus === 'syncing'}
      />
      <ContextTabs
        orgId={activeOrgId}
        sources={sources.data ?? []}
        artifact={artifact.data ?? null}
      />
    </div>
  );
}
