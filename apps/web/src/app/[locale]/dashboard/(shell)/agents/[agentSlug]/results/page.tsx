import { CutsResultsPage } from "src/core/modules/agents/pages/cuts-results-page";

type PageProps = {
  params: Promise<{ agentSlug: string }>;
};

export default async function Page({ params }: PageProps) {
  const { agentSlug } = await params;
  return <CutsResultsPage agentSlug={agentSlug} />;
}
