import { Tabs, TabsContent, TabsList, TabsTrigger } from 'src/core/shared/components/ui/tabs';
import { ColorGroupsTable } from './color-groups-table';
import { DesignAssetsTable } from './design-assets-table';
import { DesignIdentityForm } from './design-identity-form';
import type { CompanyDesignSystem } from '../hooks/use-company-design-system';

export function DesignSystemTabs({ designSystem, orgId }: { designSystem: CompanyDesignSystem; orgId: string }) {
  return (
    <Tabs defaultValue="colors" className="space-y-6">
      <TabsList variant="underline">
        <TabsTrigger value="colors">Cores</TabsTrigger>
        <TabsTrigger value="assets">Assets</TabsTrigger>
        <TabsTrigger value="identity">Identidade</TabsTrigger>
      </TabsList>
      <TabsContent value="colors">
        <ColorGroupsTable groups={designSystem.colorGroups} orgId={orgId} />
      </TabsContent>
      <TabsContent value="assets">
        <DesignAssetsTable assets={designSystem.assets} orgId={orgId} />
      </TabsContent>
      <TabsContent value="identity">
        <DesignIdentityForm designSystem={designSystem} orgId={orgId} />
      </TabsContent>
    </Tabs>
  );
}
