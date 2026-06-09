"use client";

import type { AgentRunEvent } from "@company-os/types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import {
  applyAgentRunEvent,
  shouldKeepRunStreamOpen,
} from "../utils/apply-agent-run-event";
import type { AgentRunWithSteps } from "./use-agent-run";

export function useAgentRunStream(
  runId: string | null,
  agentId: string,
  enabled: boolean,
) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!runId || !enabled) return;

    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const url = `${apiBaseUrl}/api/agents/runs/${runId}/stream`;

    const eventSource = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = eventSource;

    const handlePayload = (payload: AgentRunEvent) => {
      queryClient.setQueryData<AgentRunWithSteps>(
        ["agent-run", runId],
        (current) => applyAgentRunEvent(current, payload) ?? current,
      );

      // Keep the stream open while paused so resume/step events still arrive.
      // Closing on run_paused left the UI stuck until a full page reload.
      if (payload.type === "run_completed" || payload.type === "run_failed") {
        queryClient.setQueryData<{ runs: unknown[]; total: number } | undefined>(
          ["agent-runs", agentId, 20],
          (current) => {
            if (!current) return current;

            const nextRun = queryClient.getQueryData<AgentRunWithSteps>([
              "agent-run",
              runId,
            ])?.run;

            if (!nextRun) return current;

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
          },
        );

        eventSource.close();
      }
    };

    const handleEvent = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as AgentRunEvent;
        handlePayload(payload);
      } catch {
        // Ignore malformed SSE payloads
      }
    };

    const eventTypes: AgentRunEvent["type"][] = [
      "run_started",
      "step_started",
      "step_completed",
      "step_failed",
      "run_completed",
      "run_failed",
      "run_paused",
      "output_chunk",
    ];

    eventSource.onmessage = handleEvent;
    for (const type of eventTypes) {
      eventSource.addEventListener(type, handleEvent);
    }

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [agentId, enabled, queryClient, runId]);
}

export { shouldKeepRunStreamOpen };
