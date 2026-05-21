import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'src/core/shared/components/ui/tabs';
import type { ContextArtifact, ContextSource } from '../hooks/use-context-sources';
import { ContextArtifactTab } from './context-artifact-tab';
import { ContextSourcesTable } from './context-sources-table';

type Props = {
  orgId: string | null;
  sources: ContextSource[];
  artifact: ContextArtifact;
};

export function ContextTabs({ orgId, sources, artifact }: Props) {
  const pendingReview = sources.filter((s) => s.pipelineStatus === 'review').length;
  const [tab, setTab] = useQueryState(
    'tab',
    parseAsStringLiteral(['sources', 'artifact'] as const).withDefault('sources'),
  );

  return (
    <Tabs value={tab} onValueChange={(v) => void setTab(v as 'sources' | 'artifact')} className="space-y-6">
      <TabsList variant="underline">
        <TabsTrigger value="sources">
          Fontes
          {pendingReview > 0 && (
            <span className="ml-1.5 rounded-full bg-[var(--warning)] px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
              {pendingReview}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="artifact">Artefato</TabsTrigger>
      </TabsList>

      <TabsContent value="sources">
        <ContextSourcesTable sources={sources} orgId={orgId} />
      </TabsContent>

      <TabsContent value="artifact">
        <ContextArtifactTab artifact={artifact} orgId={orgId} />
      </TabsContent>
    </Tabs>
  );
}
