import { redirect } from "next/navigation";

import { getAgentOverviewPath } from "src/core/modules/agents/utils/agent-paths";

type PageProps = {
  params: Promise<{ agentSlug: string }>;
};

export default async function Page({ params }: PageProps) {
  const { agentSlug } = await params;
  redirect(getAgentOverviewPath(agentSlug));
}
