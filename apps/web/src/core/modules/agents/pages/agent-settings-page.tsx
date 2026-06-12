"use client";

import {
  type AgentCatalogEntry,
  getAgentByRouteSlug,
} from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { AgentEntitlementGate } from "src/core/modules/agents/components/agent-entitlement-gate";
import { CutsSettings } from "src/core/modules/agents/components/cuts/cuts-settings-form";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { SectionCard } from "src/core/shared/components/ui/section-card";
import { useTranslations } from "next-intl";

type AgentSettingsPageProps = {
  agentSlug: string;
};

const GenericAgentSettings = ({ agent }: { agent: AgentCatalogEntry }) => {
  const t = useTranslations("agents.settings");

  return (
    <SectionCard icon={agent.icon} title={agent.name} description={agent.description}>
      <Paragraph size="p5" tone="tertiary">
        {t("comingSoon")}
      </Paragraph>
    </SectionCard>
  );
};

const renderSettings = (agent: AgentCatalogEntry) => {
  switch (agent.id) {
    case "cuts":
      return <CutsSettings />;
    default:
      return <GenericAgentSettings agent={agent} />;
  }
};

export const AgentSettingsPage = ({ agentSlug }: AgentSettingsPageProps) => {
  const agent = getAgentByRouteSlug(agentSlug);

  if (!agent) {
    return null;
  }

  return (
    <div
      data-testid="agent-settings-page"
      data-agent={agent.routeSlug}
      className="flex flex-col gap-6 p-6"
    >
      <AgentEntitlementGate agent={agent}>{renderSettings(agent)}</AgentEntitlementGate>
    </div>
  );
};
