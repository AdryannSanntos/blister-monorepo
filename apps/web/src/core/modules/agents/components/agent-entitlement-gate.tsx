"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import type { AgentCatalogEntry } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { useBlisterOsStore } from "src/core/modules/blister-os/stores/blister-os-store";
import { Button } from "src/core/shared/components/ui/button";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

import { Link } from "@/i18n/routing";

type AgentEntitlementGateProps = {
  agent: AgentCatalogEntry;
  children: ReactNode;
};

export const AgentEntitlementGate = ({
  agent,
  children,
}: AgentEntitlementGateProps) => {
  const t = useTranslations("agents.surface");
  const ownedAgentIds = useBlisterOsStore((state) => state.ownedAgentIds);

  const needsEntitlement = agent.tier === "marketplace";
  const hasEntitlement = !needsEntitlement || ownedAgentIds.includes(agent.id);

  if (hasEntitlement) {
    return children;
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--warning-soft)] bg-[var(--warning-soft)] p-4">
      <Paragraph>{t("entitlementRequired")}</Paragraph>
      <Button className="mt-3" asChild>
        <Link href="/dashboard/marketplace">{t("redeemAgent")}</Link>
      </Button>
    </div>
  );
};
