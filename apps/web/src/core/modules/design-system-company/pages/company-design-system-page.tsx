'use client';

import { FileCode2 } from 'lucide-react';
import { DesignSystemHeader } from '../components/design-system-header';
import { DesignSystemTabs } from '../components/design-system-tabs';
import { useCompanyDesignSystem, useRegenerateDesignArtifact } from '../hooks/use-company-design-system';
import { useAbility } from 'src/core/modules/organization/hooks/use-ability';
import { useActiveOrganization } from 'src/core/modules/organization/hooks/use-active-organization';
import { EmptyState } from 'src/core/shared/components/ui/empty-state';
import { Skeleton } from 'src/core/shared/components/ui/skeleton';

function EmptyPermissionState() {
  return <EmptyState icon={FileCode2} title="Design System indisponivel" description="Voce nao tem permissao para acessar a identidade visual deste workspace." />;
}

export function CompanyDesignSystemPage() {
  const { activeOrgId } = useActiveOrganization();
  const { can, isLoading: isAbilityLoading } = useAbility();
  const canRead = can('read', 'DesignSystem');
  const designSystem = useCompanyDesignSystem(activeOrgId);
  const regenerate = useRegenerateDesignArtifact(activeOrgId);

  if (!activeOrgId) return null;
  if (!isAbilityLoading && !canRead) return <EmptyPermissionState />;
  if (designSystem.isLoading) return <div className="space-y-6"><Skeleton className="h-28 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (!designSystem.data) return <EmptyState icon={FileCode2} title="Design System nao carregado" description="Nao foi possivel carregar a identidade visual da empresa agora." />;

  return <div className="space-y-6"><DesignSystemHeader designSystem={designSystem.data} onRegenerate={() => regenerate.mutate()} isRegenerating={regenerate.isPending} /><DesignSystemTabs designSystem={designSystem.data} orgId={activeOrgId} /></div>;
}
