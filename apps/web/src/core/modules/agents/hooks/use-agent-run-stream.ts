"use client";

import type { AgentRunEvent } from "@company-os/types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import {
  hydrateFromBlocks,
  isBlockEvent,
  reduceBlockEvent,
} from "../utils/agent-block-reducer";
import {
  applyAgentRunEvent,
  shouldKeepRunStreamOpen,
} from "../utils/apply-agent-run-event";
import type { AgentRunWithSteps } from "./use-agent-run";

const BLOCK_EVENT_TYPES: AgentRunEvent["type"][] = [
  "message_start",
  "block_start",
  "block_delta",
  "block_end",
  "message_end",
];

const TERMINAL_EVENT_TYPES: AgentRunEvent["type"][] = [
  "run_completed",
  "run_failed",
  "run_cancelled",
];

const MAX_SSE_RETRIES = 5;

export function useAgentRunStream(
  runId: string | null,
  agentId: string,
  enabled: boolean,
) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!runId || !enabled) return;

    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const url = `${apiBaseUrl}/api/agents/runs/${runId}/stream`;

    const handleTerminalEvent = () => {
      const snapshot = queryClient.getQueryData<AgentRunWithSteps>([
        "agent-run",
        runId,
      ]);

      void queryClient
        .invalidateQueries({ queryKey: ["agent-run", runId] })
        .then(() => {
          if (!snapshot?.blockChatState) return;
          queryClient.setQueryData<AgentRunWithSteps>(
            ["agent-run", runId],
            (current) =>
              current
                ? {
                    ...current,
                    blockChatState: snapshot.blockChatState,
                  }
                : current,
          );
        });

      const nextRun = queryClient.getQueryData<AgentRunWithSteps>([
        "agent-run",
        runId,
      ])?.run;

      if (nextRun) {
        // Update every cached run list for this agent regardless of the `limit`
        // segment in the query key (lists may be requested with different limits).
        queryClient.setQueriesData<
          { runs: unknown[]; total: number } | undefined
        >({ queryKey: ["agent-runs", agentId] }, (current) => {
          if (!current) return current;

          const runs = current.runs.map((run) =>
            typeof run === "object" &&
            run !== null &&
            (run as { id?: string }).id === runId
              ? nextRun
              : run,
          );

          const hasRun = runs.some(
            (run) =>
              typeof run === "object" &&
              run !== null &&
              (run as { id?: string }).id === runId,
          );

          return {
            ...current,
            runs: hasRun ? runs : [nextRun, ...runs],
          };
        });
      }
    };

    const handlePayload = (payload: AgentRunEvent) => {
      queryClient.setQueryData<AgentRunWithSteps>(
        ["agent-run", runId],
        (current) => {
          if (!current) return current;

          let next = applyAgentRunEvent(current, payload) ?? current;

          if (isBlockEvent(payload.type)) {
            const baseState =
              next.blockChatState ??
              hydrateFromBlocks(next.blocks ?? [], next.run.status);
            next = {
              ...next,
              blockChatState: reduceBlockEvent(baseState, payload),
            };
          }

          return next;
        },
      );

      if (TERMINAL_EVENT_TYPES.includes(payload.type)) {
        handleTerminalEvent();
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
      }
    };

    const connect = () => {
      eventSourceRef.current?.close();

      const eventSource = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = eventSource;

      const handleEvent = (event: MessageEvent<string>) => {
        try {
          const payload = JSON.parse(event.data) as AgentRunEvent;
          retryCountRef.current = 0;
          handlePayload(payload);
        } catch (error) {
          console.warn("[agent-run-stream] Malformed SSE payload", error);
        }
      };

      const eventTypes: AgentRunEvent["type"][] = [
        "run_started",
        "run_paused",
        ...TERMINAL_EVENT_TYPES,
        ...BLOCK_EVENT_TYPES,
      ];

      eventSource.onmessage = handleEvent;
      for (const type of eventTypes) {
        eventSource.addEventListener(type, handleEvent);
      }

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;

        if (retryCountRef.current >= MAX_SSE_RETRIES) {
          void queryClient.invalidateQueries({
            queryKey: ["agent-run", runId],
          });
          return;
        }

        retryCountRef.current += 1;
        reconnectTimerRef.current = setTimeout(
          connect,
          Math.min(1000 * retryCountRef.current, 5000),
        );
      };
    };

    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      retryCountRef.current = 0;
    };
  }, [agentId, enabled, queryClient, runId]);
}

export { shouldKeepRunStreamOpen };
