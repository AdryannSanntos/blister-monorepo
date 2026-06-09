"use client";

import type { AgentRunEvent } from "@company-os/types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

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

    const handleEvent = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as AgentRunEvent;

        if (
          payload.type === "run_completed" ||
          payload.type === "run_failed" ||
          payload.type === "run_paused" ||
          payload.type === "step_completed"
        ) {
          queryClient.invalidateQueries({ queryKey: ["agent-run", runId] });
          queryClient.invalidateQueries({ queryKey: ["agent-runs", agentId] });
        }
      } catch {
        // Ignore malformed SSE payloads
      }
    };

    eventSource.onmessage = handleEvent;
    eventSource.addEventListener("run_completed", handleEvent);
    eventSource.addEventListener("run_failed", handleEvent);
    eventSource.addEventListener("run_paused", handleEvent);
    eventSource.addEventListener("step_completed", handleEvent);
    eventSource.addEventListener("step_started", handleEvent);

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [agentId, enabled, queryClient, runId]);
}
