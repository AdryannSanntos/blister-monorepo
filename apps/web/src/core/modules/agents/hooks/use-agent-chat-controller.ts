"use client";

import { useQueries, useQueryClient } from "@tanstack/react-query";
import type { ChatStatus } from "ai";
import { useTranslations } from "next-intl";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";
import type { SuggestionItem } from "@/components/agent-elements/input/suggestions";
import type { QuestionAnswer } from "@/components/agent-elements/question/question-prompt";
import { AGENT_UI_CONFIG, type AgentUiId } from "../config/agent-ui-config";
import { type AgentRunWithSteps, useAgentRun } from "../hooks/use-agent-run";
import {
  useApproveAgentRun,
  useCancelAgentRun,
  useEditAgentRunOutput,
  useRegenerateAgentRun,
  useRejectAgentRun,
  useResumeAgentRun,
  useStartAgentRun,
} from "../hooks/use-agent-run-mutations";
import {
  shouldKeepRunStreamOpen,
  useAgentRunStream,
} from "../hooks/use-agent-run-stream";
import { useCampaigns } from "../hooks/use-campaigns";
import {
  getRunUserInput,
  parseCopywriterOutput,
  parsePostOutput,
} from "../utils/agent-run-helpers";
import { mergeBlockState, hydrateFromBlocks } from "../utils/agent-block-reducer";
import {
  resolveChatStatus,
  type PlanApprovalCallbacks,
} from "../utils/build-agent-messages";
import { isPostDesignPlanAwaitingApproval } from "../utils/post-onboarding-fields";
import {
  buildThreadMessagesFromBlocks,
} from "../utils/build-messages-from-blocks";
import { formatAgentOutputMarkdown } from "../utils/format-agent-output-markdown";
import {
  createChatId,
  findChatIdByRunId,
  migrateLegacySession,
  useAgentChatSession,
} from "./use-agent-chat-session";

type PendingFlow = null | "reject" | "regenerate" | "edit";

const createQueuedRunPlaceholder = (
  runId: string,
  agentId: AgentUiId,
  userInput: string,
  campaignId?: string | null,
): AgentRunWithSteps => {
  const now = new Date().toISOString();

  return {
    run: {
      id: runId,
      agentId,
      companyId: "",
      campaignId: campaignId ?? null,
      status: "QUEUED",
      currentStepKey: null,
      inputPayload: { userInput },
      outputPayload: {},
      errorMessage: null,
      pauseReason: null,
      pauseFormSchema: null,
      reviewStatus: null,
      creditCost: null,
      createdAt: now,
      startedAt: null,
      completedAt: null,
    },
    steps: [],
    blocks: [],
  };
};

export function useAgentChatController(agentId: AgentUiId) {
  const t = useTranslations("agents.surface");
  const tReview = useTranslations("agents.review");
  const tAgent = useTranslations("agents");
  const config = AGENT_UI_CONFIG[agentId];
  const queryClient = useQueryClient();

  const [runId, setRunId] = useQueryState("runId", parseAsString);
  const [chatId, setChatId] = useQueryState("chatId", parseAsString);
  const [campaignId] = useQueryState("campaignId", parseAsString);
  const [pendingFlow, setPendingFlow] = useState<PendingFlow>(null);
  const [optimisticUserInput, setOptimisticUserInput] = useState<string | null>(
    null,
  );

  const {
    sessionRunIds,
    appendRun,
    resetSession,
    initChat,
    setSessionRunIds,
  } = useAgentChatSession(agentId, chatId);

  useEffect(() => {
    if (chatId || !runId) return;
    const existingChatId = findChatIdByRunId(agentId, runId);
    if (existingChatId) {
      void setChatId(existingChatId);
      return;
    }
    const migratedChatId = migrateLegacySession(agentId, runId);
    void setChatId(migratedChatId ?? createChatId());
  }, [agentId, chatId, runId, setChatId]);

  useCampaigns();

  const { data: runData } = useAgentRun(runId);

  const sessionQueries = useQueries({
    queries: sessionRunIds.map((sessionRunId) => ({
      queryKey: ["agent-run", sessionRunId],
      queryFn: async () => {
        const { data } = await apiClient.get<AgentRunWithSteps>(
          `/agents/runs/${sessionRunId}`,
        );
        return data;
      },
      enabled: Boolean(sessionRunId),
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    })),
  });

  const sessionRuns = useMemo(
    () => {
      const seenRunIds = new Set<string>();

      return sessionRunIds
        .filter((sessionRunId) => {
          if (seenRunIds.has(sessionRunId)) return false;
          seenRunIds.add(sessionRunId);
          return true;
        })
        .map((sessionRunId) => {
          const fromQuery = sessionQueries.find(
            (query) => query.data?.run.id === sessionRunId,
          )?.data;
          if (fromQuery) return fromQuery;

          const fromCache = queryClient.getQueryData<AgentRunWithSteps>([
            "agent-run",
            sessionRunId,
          ]);
          if (fromCache) return fromCache;

          if (sessionRunId === runId && runData) return runData;

          return null;
        })
        .filter((entry): entry is AgentRunWithSteps => Boolean(entry));
    },
    [queryClient, runData, runId, sessionQueries, sessionRunIds],
  );

  useEffect(() => {
    if (!chatId || !runId) return;
    setSessionRunIds((previous) =>
      previous.includes(runId) ? previous : [...previous, runId],
    );
  }, [chatId, runId, setSessionRunIds]);

  const startRunMutation = useStartAgentRun(agentId);
  const resumeRunMutation = useResumeAgentRun(runId, agentId);
  const cancelRunMutation = useCancelAgentRun(runId, agentId);
  const approveMutation = useApproveAgentRun(runId, agentId);
  const rejectMutation = useRejectAgentRun(runId, agentId);
  const editMutation = useEditAgentRunOutput(runId, agentId);
  const regenerateMutation = useRegenerateAgentRun(runId, agentId);

  const activeRun = runData?.run ?? null;

  const streamEnabled = Boolean(runId && shouldKeepRunStreamOpen(activeRun));
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

  const threadRuns = useMemo(() => {
    if (sessionRuns.length > 0) {
      return sessionRuns.map((entry) => {
        const persisted = hydrateFromBlocks(entry.blocks ?? [], entry.run.status);
        const messages = mergeBlockState(
          persisted,
          entry.blockChatState,
        ).messages;
        const hasAssistantBlocks = messages.some(
          (message) => message.role === "assistant" && message.blocks.length > 0,
        );
        const hasLiveAssistantTimeline = Boolean(
          entry.blockChatState?.messages.some(
            (message) => message.role === "assistant" && message.blocks.length > 0,
          ),
        );

        return {
          run: entry.run,
          messages,
          hasBlocks: hasAssistantBlocks || hasLiveAssistantTimeline,
        };
      });
    }

    if (activeRun) {
      const persisted = hydrateFromBlocks(runData?.blocks ?? [], activeRun.status);
      const messages = mergeBlockState(
        persisted,
        runData?.blockChatState,
      ).messages;
      const hasAssistantBlocks = messages.some(
        (message) => message.role === "assistant" && message.blocks.length > 0,
      );
      const hasLiveAssistantTimeline = Boolean(
        runData?.blockChatState?.messages.some(
          (message) => message.role === "assistant" && message.blocks.length > 0,
        ),
      );

      return [
        {
          run: activeRun,
          messages,
          hasBlocks: hasAssistantBlocks || hasLiveAssistantTimeline,
        },
      ];
    }

    return [];
  }, [activeRun, runData?.blockChatState, runData?.blocks, sessionRuns]);

  const submitPausedFormAnswer = useCallback(
    async (answer: QuestionAnswer) => {
      if (!runId || !activeRun || activeRun.status !== "PAUSED") return;

      const schema = activeRun.pauseFormSchema as {
        fields?: Array<{ name: string }>;
      } | null;
      const field = schema?.fields?.[0];
      const formData: Record<string, unknown> = {};

      if (field) {
        if (answer.kind === "skip") {
          formData[field.name] = "";
        } else if (answer.kind === "text") {
          formData[field.name] = answer.text ?? "";
        } else if (answer.kind === "single") {
          formData[field.name] = answer.selectedIds?.[0] ?? answer.text ?? "";
        } else {
          const ids = answer.selectedIds ?? [];
          formData[field.name] = answer.text ? [...ids, answer.text] : ids;
        }
      } else if (answer.kind === "text") {
        formData.confirmed = answer.text ?? true;
      } else {
        formData.confirmed = true;
      }

      queryClient.setQueryData<AgentRunWithSteps>(
        ["agent-run", runId],
        (current) => {
          if (!current) return current;
          const mergedInput = {
            ...(current.run.inputPayload as Record<string, unknown>),
            ...formData,
          };
          return {
            ...current,
            run: {
              ...current.run,
              status: "QUEUED",
              inputPayload: mergedInput,
              pauseReason: null,
              pauseFormSchema: null,
            },
          };
        },
      );

      try {
        await resumeRunMutation.mutateAsync({ formData });
        toast.success(t("resumeSuccess"));
      } catch {
        queryClient.invalidateQueries({ queryKey: ["agent-run", runId] });
        toast.error(t("resumeError"));
      }
    },
    [activeRun, queryClient, resumeRunMutation, runId, t],
  );

  const submitDesignPlanApproval = useCallback(async () => {
    if (!runId || !activeRun || !isPostDesignPlanAwaitingApproval(activeRun)) {
      return;
    }

    const formData = { designPlanApproved: true };

    queryClient.setQueryData<AgentRunWithSteps>(
      ["agent-run", runId],
      (current) => {
        if (!current) return current;
        const mergedInput = {
          ...(current.run.inputPayload as Record<string, unknown>),
          ...formData,
        };
        return {
          ...current,
          run: {
            ...current.run,
            status: "QUEUED",
            inputPayload: mergedInput,
            pauseReason: null,
            pauseFormSchema: null,
          },
        };
      },
    );

    try {
      await resumeRunMutation.mutateAsync({ formData });
      toast.success(tAgent("designPlan.approveSuccess"));
    } catch {
      queryClient.invalidateQueries({ queryKey: ["agent-run", runId] });
      toast.error(tAgent("designPlan.approveError"));
    }
  }, [activeRun, queryClient, resumeRunMutation, runId, tAgent]);

  const clarificationCallbacks = useMemo(
    () =>
      activeRun?.status === "PAUSED" &&
      !isPostDesignPlanAwaitingApproval(activeRun)
        ? {
            onAnswer: (answer: QuestionAnswer) => {
              void submitPausedFormAnswer(answer);
            },
            submitLabel: tAgent("clarification.continue"),
          }
        : null,
    [activeRun, submitPausedFormAnswer, tAgent],
  );

  const planApprovalCallbacks = useMemo<PlanApprovalCallbacks | null>(
    () =>
      activeRun && isPostDesignPlanAwaitingApproval(activeRun)
        ? {
            onApprove: () => {
              void submitDesignPlanApproval();
            },
            approveLabel: tAgent("designPlan.approve"),
          }
        : null,
    [activeRun, submitDesignPlanApproval, tAgent],
  );

  const status: ChatStatus = resolveChatStatus(
    activeRun,
    startRunMutation.isPending,
    optimisticUserInput,
  );

  const buildConversationHistory = useCallback(() => {
    return sessionRuns
      .filter((entry) => entry.run.status === "COMPLETED")
      .map((entry) => ({
        userInput: getRunUserInput(entry.run),
        assistantSummary: formatAgentOutputMarkdown(
          agentId,
          entry.run.outputPayload,
        ).slice(0, 2000),
      }))
      .filter((turn) => turn.userInput.trim().length > 0);
  }, [agentId, sessionRuns]);

  const ensureChatId = useCallback(async (): Promise<string> => {
    if (chatId) return chatId;
    const nextChatId = createChatId();
    await setChatId(nextChatId);
    return nextChatId;
  }, [chatId, setChatId]);

  const startRunWithInput = useCallback(
    async (trimmed: string, options?: { continueSession?: boolean }) => {
      setOptimisticUserInput(trimmed);

      const conversationHistory =
        options?.continueSession === true ? buildConversationHistory() : [];

      try {
        await ensureChatId();

        const result = await startRunMutation.mutateAsync({
          userInput: trimmed,
          campaignId: campaignId ?? undefined,
          metadata:
            conversationHistory.length > 0
              ? { conversationHistory }
              : undefined,
        });

        queryClient.setQueryData<AgentRunWithSteps>(
          ["agent-run", result.runId],
          createQueuedRunPlaceholder(
            result.runId,
            agentId,
            trimmed,
            campaignId ?? null,
          ),
        );

        appendRun(result.runId);
        setRunId(result.runId);
        setPendingFlow(null);
        setOptimisticUserInput(null);
      } catch {
        setOptimisticUserInput(null);
        toast.error(t("startError"));
      }
    },
    [
      agentId,
      appendRun,
      buildConversationHistory,
      campaignId,
      ensureChatId,
      queryClient,
      setRunId,
      startRunMutation,
      t,
    ],
  );

  const handleSend = useCallback(
    async ({ content }: { role: "user"; content: string }) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      if (!runId || !activeRun) {
        await startRunWithInput(trimmed);
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
        await startRunWithInput(trimmed, { continueSession: true });
      }
    },
    [activeRun, runId, startRunWithInput],
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
        await submitPausedFormAnswer(answer);
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
          queryClient.setQueryData<AgentRunWithSteps>(
            ["agent-run", result.runId],
            createQueuedRunPlaceholder(
              result.runId,
              agentId,
              getRunUserInput(activeRun),
              activeRun.campaignId,
            ),
          );
          await ensureChatId();
          appendRun(result.runId);
          setRunId(result.runId);
          setPendingFlow(null);
          toast.success(tReview("regenerateSuccess"));
        } catch {
          toast.error(tReview("regenerateError"));
        }
        return;
      }

      if (toolCallId?.startsWith("edit-")) {
        const editedCaption = answer.kind === "text" ? answer.text?.trim() : "";
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
      appendRun,
      editMutation,
      ensureChatId,
      queryClient,
      regenerateMutation,
      rejectMutation,
      runId,
      setRunId,
      submitPausedFormAnswer,
      tReview,
    ],
  );

  const questionAnswerHandler = useCallback(
    (payload: {
      toolCallId?: string;
      answer: QuestionAnswer;
    }) => {
      void handleQuestionAnswer({
        toolCallId: payload.toolCallId,
        question: { title: "" },
        answer: payload.answer,
      });
    },
    [handleQuestionAnswer],
  );

  const messages = useMemo(
    () => {
      const built = buildThreadMessagesFromBlocks({
        agentId,
        runs: threadRuns,
        activeRunId: runId,
        optimisticUserInput,
        reviewCallbacks,
        clarificationCallbacks,
        planApprovalCallbacks,
        questionAnswerHandler,
        rejectQuestion: pendingFlow === "reject",
        regenerateQuestion: pendingFlow === "regenerate",
        editQuestion: editCaption ? { caption: editCaption } : null,
      });

      return built;
    },
    [
      agentId,
      clarificationCallbacks,
      editCaption,
      optimisticUserInput,
      pendingFlow,
      planApprovalCallbacks,
      questionAnswerHandler,
      reviewCallbacks,
      runId,
      threadRuns,
    ],
  );

  const openRun = useCallback(
    (nextRunId: string) => {
      const existingChatId = findChatIdByRunId(agentId, nextRunId);
      if (existingChatId) {
        void setChatId(existingChatId);
        setRunId(nextRunId);
        setPendingFlow(null);
        setOptimisticUserInput(null);
        return;
      }

      const nextChatId = createChatId();
      void setChatId(nextChatId);
      initChat(nextChatId, [nextRunId]);
      setRunId(nextRunId);
      setPendingFlow(null);
      setOptimisticUserInput(null);
    },
    [agentId, initChat, setChatId, setRunId],
  );

  const startNewRun = useCallback(() => {
    resetSession();
    setChatId(null);
    setRunId(null);
    setPendingFlow(null);
    setOptimisticUserInput(null);
  }, [resetSession, setChatId, setRunId]);

  return {
    config,
    runId,
    activeRun,
    messages,
    status,
    suggestions,
    pendingFlow,
    handleSend,
    handleStop,
    openRun,
    startNewRun,
  };
}
