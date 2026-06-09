"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import { SpiralLoader } from "@/components/agent-elements/spiral-loader";
import { Button } from "@/core/shared/components/ui/button";
import {
  Card,
  CardContent,
} from "@/core/shared/components/ui/card";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import {
  Tabs,
  TabsContent,
} from "src/core/shared/components/ui/tabs";

import { AgentHistoryPanel } from "../components/agent-history-panel";
import { AgentSurfaceTabs } from "../components/agent-surface-tabs";
import { BlisterAgentChat } from "../components/blister-agent-chat";
import { BLISTER_TOOL_RENDERERS } from "../components/blister-tool-renderers";
import { AGENT_UI_CONFIG, type AgentUiId } from "../config/agent-ui-config";
import { useAgentChatController } from "../hooks/use-agent-chat-controller";
import { useAgentRuns } from "../hooks/use-agent-runs";

const AGENT_TAB_VALUES = ["agent", "history"] as const;
type AgentTab = (typeof AGENT_TAB_VALUES)[number];

type AgentSurfacePageProps = {
  agentId: AgentUiId;
};

export function AgentSurfacePage({ agentId }: AgentSurfacePageProps) {
  const config = AGENT_UI_CONFIG[agentId];
  const t = useTranslations("agents");
  const tChat = useTranslations("agents.chat");
  const tInput = useTranslations("agents.input");

  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(AGENT_TAB_VALUES).withDefault("agent"),
  );

  const {
    runId,
    messages,
    status,
    suggestions,
    isLoadingRun,
    handleSend,
    handleStop,
    handleQuestionAnswer,
    openRun,
    startNewRun,
  } = useAgentChatController(agentId);

  const { data: runsData, isLoading: isLoadingRuns } = useAgentRuns(agentId);
  const runs = runsData?.runs ?? [];

  const handleSelectHistoryRun = (nextRunId: string) => {
    openRun(nextRunId);
    void setTab("agent");
  };

  const handleNewRun = () => {
    startNewRun();
    void setTab("agent");
  };

  const agentLabel = t(config.labelKey);
  const agentDescription = t(config.descriptionKey);
  const placeholder = t(config.placeholderKey);

  return (
    <div data-testid="agent-surface-page">
      <PageLayout
        icon={config.icon}
        title={agentLabel}
        description={agentDescription}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {tab === "agent" && runId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleNewRun}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                {tChat("newChat")}
              </Button>
            ) : null}
            {config.estimatedCredits != null ? (
              <div className="rounded-full bg-[var(--bg-raised)] px-3 py-1.5 text-[13px] font-medium tabular-nums text-[var(--fg-secondary)]">
                {tInput("estimatedCost", {
                  amount: config.estimatedCredits.toFixed(2),
                })}
              </div>
            ) : null}
          </div>
        }
      >
        <Tabs
          value={tab}
          onValueChange={(value) => void setTab(value as AgentTab)}
          className="flex w-full flex-col gap-6"
        >
          <AgentSurfaceTabs />

          <TabsContent
            value="agent"
            data-testid="agent-chat-tab"
            className="mt-0 animate-in fade-in duration-200 focus-visible:outline-none"
          >
            <Card className="overflow-hidden border-[var(--line-default)] bg-[var(--bg-base)]">
              <div className="h-[min(680px,calc(100svh-22rem))] min-h-[480px]">
                {isLoadingRun && runId ? (
                  <div className="flex h-full items-center justify-center bg-[var(--bg-canvas)]">
                    <SpiralLoader size={40} />
                  </div>
                ) : (
                  <BlisterAgentChat
                    config={config}
                    placeholder={placeholder}
                    messages={messages}
                    status={status}
                    suggestions={suggestions}
                    onSend={handleSend}
                    onStop={handleStop}
                    toolRenderers={BLISTER_TOOL_RENDERERS}
                    showCopyToolbar
                    questionTool={{
                      submitLabel: t("clarification.continue"),
                      skipLabel: t("clarification.cancel"),
                      allowSkip: false,
                      onAnswer: handleQuestionAnswer,
                    }}
                    className="h-full"
                  />
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent
            value="history"
            data-testid="agent-history-tab"
            className="mt-0 animate-in fade-in duration-200 focus-visible:outline-none"
          >
            <Card className="border-[var(--line-default)] bg-[var(--bg-base)]">
              <CardContent className="p-6">
                <AgentHistoryPanel
                  agentId={agentId}
                  runs={runs}
                  isLoading={isLoadingRuns}
                  selectedRunId={runId}
                  onSelectRun={handleSelectHistoryRun}
                  onNewRun={handleNewRun}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageLayout>
    </div>
  );
}
