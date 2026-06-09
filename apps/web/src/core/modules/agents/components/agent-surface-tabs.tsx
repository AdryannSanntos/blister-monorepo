"use client";

import { History, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { TabsList } from "src/core/shared/components/ui/tabs";

import { AgentTabTrigger } from "./agent-tab-trigger";

export function AgentSurfaceTabs() {
  const tTabs = useTranslations("agents.tabs");

  return (
    <TabsList variant="pill" className="flex-wrap justify-start">
      <AgentTabTrigger
        value="agent"
        label={tTabs("agent")}
        icon={Sparkles}
      />
      <AgentTabTrigger
        value="history"
        label={tTabs("history")}
        icon={History}
      />
    </TabsList>
  );
}
