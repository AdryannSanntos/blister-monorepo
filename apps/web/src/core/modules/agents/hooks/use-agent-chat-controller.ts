"use client";

import type { ChatStatus } from "ai";
import { useTranslations } from "next-intl";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import type { SuggestionItem } from "@/components/agent-elements/input/suggestions";
import type { QuestionAnswer } from "@/components/agent-elements/question/question-prompt";

import { AGENT_UI_CONFIG, type AgentUiId } from "../config/agent-ui-config";
import { useAgentRun } from "../hooks/use-agent-run";
import {
  useApproveAgentRun,
  useCancelAgentRun,
  useEditAgentRunOutput,
  useRegenerateAgentRun,
  useRejectAgentRun,
  useResumeAgentRun,
  useStartAgentRun,
} from "../hooks/use-agent-run-mutations";
import { useAgentRunStream } from "../hooks/use-agent-run-stream";
import { useCampaigns } from "../hooks/use-campaigns";
import {
  buildAgentMessages,
  resolveChatStatus,
} from "../utils/build-agent-messages";
import {
  parseCopywriterOutput,
  parsePostOutput,
} from "../utils/agent-run-helpers";

type PendingFlow = null | "reject" | "regenerate" | "edit";

export function useAgentChatController(agentId: AgentUiId) {
  const t = useTranslations("agents.surface");
  const tReview = useTranslations("agents.review");
  const tAgent = useTranslations("agents");
  const config = AGENT_UI_CONFIG[agentId];

  const [runId, setRunId] = useQueryState("runId", parseAsString);
  const [campaignId] = useQueryState("campaignId", parseAsString);
  const [pendingFlow, setPendingFlow] = useState<PendingFlow>(null);

  useCampaigns();

  const { data: runData, isLoading: isLoadingRun } = useAgentRun(runId);

  const startRunMutation = useStartAgentRun(agentId);
  const resumeRunMutation = useResumeAgentRun(runId, agentId);
  const cancelRunMutation = useCancelAgentRun(runId, agentId);
  const approveMutation = useApproveAgentRun(runId, agentId);
  const rejectMutation = useRejectAgentRun(runId, agentId);
  const editMutation = useEditAgentRunOutput(runId, agentId);
  const regenerateMutation = useRegenerateAgentRun(runId, agentId);

  const activeRun = runData?.run ?? null;
  const steps = runData?.steps ?? [];

  const streamEnabled = Boolean(
    runId &&
      activeRun &&
      ["QUEUED", "RUNNING", "PAUSED"].includes(activeRun.status),
  );
  useAgentRunStream(runId, agentId, streamEnabled);

  const suggestions = useMemo<SuggestionItem[]>(
    () =>
      config.suggestionKeys.map((key) => ({
        id: key,
        label: tAgent(key),
        value: tAgent(key),
      })),
    [config.suggestionKeys, tAgent],
  );

  const handleApprove = useCallback(async () => {
    try {
      await approveMutation.mutateAsync({});
      toast.success(tReview("approveSuccess"));
    } catch {
      toast.error(tReview("approveError"));
    }
  }, [approveMutation, tReview]);

  const handleRejectStart = useCallback(() => {
    setPendingFlow("reject");
  }, []);

  const handleRegenerateStart = useCallback(() => {
    setPendingFlow("regenerate");
  }, []);

  const handleEditStart = useCallback(() => {
    setPendingFlow("edit");
  }, []);

  const reviewCallbacks = useMemo(
    () =>
      activeRun
        ? {
            onApprove: handleApprove,
            onReject: handleRejectStart,
            onRegenerate: handleRegenerateStart,
            onEdit: handleEditStart,
          }
        : null,
    [
      activeRun,
      handleApprove,
      handleEditStart,
      handleRegenerateStart,
      handleRejectStart,
    ],
  );

  const editCaption = useMemo(() => {
    if (pendingFlow !== "edit" || !activeRun) return null;
    const output =
      agentId === "post"
        ? parsePostOutput(activeRun.outputPayload)
        : parseCopywriterOutput(activeRun.outputPayload);
    return output.caption ?? "";
  }, [activeRun, agentId, pendingFlow]);

  const messages = useMemo(
    () =>
      buildAgentMessages({
        agentId,
        run: activeRun,
        steps,
        reviewCallbacks,
        rejectQuestion: pendingFlow === "reject",
        regenerateQuestion: pendingFlow === "regenerate",
        editQuestion: editCaption ? { caption: editCaption } : null,
      }),
    [
      activeRun,
      agentId,
      editCaption,
      pendingFlow,
      reviewCallbacks,
      steps,
    ],
  );

  const status: ChatStatus = resolveChatStatus(
    activeRun,
    startRunMutation.isPending,
  );

  const handleSend = useCallback(
    async ({ content }: { role: "user"; content: string }) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      if (!runId || !activeRun) {
        try {
          const result = await startRunMutation.mutateAsync({
            userInput: trimmed,
            campaignId: campaignId ?? undefined,
          });
          setRunId(result.runId);
          setPendingFlow(null);
          toast.success(t("startSuccess"));
        } catch {
          toast.error(t("startError"));
        }
        return;
      }

      if (
        activeRun.status === "QUEUED" ||
        activeRun.status === "RUNNING" ||
        activeRun.status === "PAUSED"
      ) {
        return;
      }

      if (
        activeRun.status === "COMPLETED" ||
        activeRun.status === "FAILED" ||
        activeRun.status === "CANCELLED"
      ) {
        try {
          const result = await startRunMutation.mutateAsync({
            userInput: trimmed,
            campaignId: activeRun.campaignId ?? campaignId ?? undefined,
          });
          setRunId(result.runId);
          setPendingFlow(null);
          toast.success(t("startSuccess"));
        } catch {
          toast.error(t("startError"));
        }
      }
    },
    [activeRun, campaignId, runId, setRunId, startRunMutation, t],
  );

  const handleStop = useCallback(async () => {
    if (!runId || !activeRun) return;
    try {
      await cancelRunMutation.mutateAsync();
      toast.success(t("cancelSuccess"));
    } catch {
      toast.error(t("cancelError"));
    }
  }, [activeRun, cancelRunMutation, runId, t]);

  const handleQuestionAnswer = useCallback(
    async (payload: {
      toolCallId?: string;
      question: { title: string };
      answer: QuestionAnswer;
    }) => {
      const { toolCallId, answer } = payload;
      if (!runId || !activeRun) return;

      if (toolCallId?.startsWith("clarify-") || activeRun.status === "PAUSED") {
        const schema = activeRun.pauseFormSchema as {
          fields?: Array<{ name: string }>;
        } | null;
        const fields = schema?.fields ?? [];
        const formData: Record<string, unknown> = {};

        if (fields.length > 0 && answer.kind === "text") {
          fields.forEach((field, index) => {
            if (index === 0) formData[field.name] = answer.text ?? "";
          });
        } else if (answer.kind === "skip") {
          formData.confirmed = true;
        } else if (answer.kind === "text") {
          formData.confirmed = answer.text ?? true;
        }

        try {
          await resumeRunMutation.mutateAsync({ formData });
          toast.success(t("resumeSuccess"));
        } catch {
          toast.error(t("resumeError"));
        }
        return;
      }

      if (toolCallId?.startsWith("reject-")) {
        const reason = answer.kind === "text" ? answer.text?.trim() : "";
        if (!reason) return;
        try {
          await rejectMutation.mutateAsync({ reason });
          setPendingFlow(null);
          toast.success(tReview("rejectSuccess"));
        } catch {
          toast.error(tReview("rejectError"));
        }
        return;
      }

      if (toolCallId?.startsWith("regenerate-")) {
        const instruction =
          answer.kind === "text" ? answer.text?.trim() : undefined;
        try {
          const result = await regenerateMutation.mutateAsync({ instruction });
          setRunId(result.runId);
          setPendingFlow(null);
          toast.success(tReview("regenerateSuccess"));
        } catch {
          toast.error(tReview("regenerateError"));
        }
        return;
      }

      if (toolCallId?.startsWith("edit-")) {
        const editedCaption =
          answer.kind === "text" ? answer.text?.trim() : "";
        if (!editedCaption) return;

        const baseOutput =
          agentId === "post"
            ? parsePostOutput(activeRun.outputPayload)
            : parseCopywriterOutput(activeRun.outputPayload);

        try {
          await editMutation.mutateAsync({
            editedOutput: {
              caption: editedCaption,
              hashtags: baseOutput.hashtags ?? [],
            },
          });
          setPendingFlow(null);
          toast.success(tReview("editSuccess"));
        } catch {
          toast.error(tReview("editError"));
        }
      }
    },
    [
      activeRun,
      agentId,
      editMutation,
      regenerateMutation,
      rejectMutation,
      resumeRunMutation,
      runId,
      setRunId,
      t,
      tReview,
    ],
  );

  const openRun = useCallback(
    (nextRunId: string) => {
      setRunId(nextRunId);
      setPendingFlow(null);
    },
    [setRunId],
  );

  const startNewRun = useCallback(() => {
    setRunId(null);
    setPendingFlow(null);
  }, [setRunId]);

  return {
    config,
    runId,
    activeRun,
    messages,
    status,
    suggestions,
    isLoadingRun,
    pendingFlow,
    handleSend,
    handleStop,
    handleQuestionAnswer,
    openRun,
    startNewRun,
  };
}
