"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AgentUiId } from "../config/agent-ui-config";

const STORAGE_PREFIX = "blister:agent-chat:";
const INDEX_PREFIX = "blister:agent-chat-index:";

type ChatSession = {
  runIds: string[];
  updatedAt: string;
};

type ChatIndex = Record<string, string>;

const getStorageKey = (agentId: AgentUiId, chatId: string) =>
  `${STORAGE_PREFIX}${agentId}:${chatId}`;

const getIndexKey = (agentId: AgentUiId) => `${INDEX_PREFIX}${agentId}`;

export const dedupeRunIds = (runIds: string[]): string[] => [...new Set(runIds)];

const loadIndex = (agentId: AgentUiId): ChatIndex => {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(getIndexKey(agentId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ChatIndex;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const saveIndex = (agentId: AgentUiId, index: ChatIndex) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(getIndexKey(agentId), JSON.stringify(index));
};

export const loadSession = (agentId: AgentUiId, chatId: string): string[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(getStorageKey(agentId, chatId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession;
    return dedupeRunIds(
      Array.isArray(parsed.runIds) ? parsed.runIds : [],
    );
  } catch {
    return [];
  }
};

const saveSession = (
  agentId: AgentUiId,
  chatId: string,
  runIds: string[],
) => {
  if (typeof window === "undefined") return;

  const payload: ChatSession = {
    runIds: dedupeRunIds(runIds),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(
    getStorageKey(agentId, chatId),
    JSON.stringify(payload),
  );
};

const clearSession = (agentId: AgentUiId, chatId: string) => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getStorageKey(agentId, chatId));
};

const updateIndex = (
  agentId: AgentUiId,
  chatId: string,
  runIds: string[],
) => {
  if (typeof window === "undefined" || runIds.length === 0) return;

  const index = loadIndex(agentId);
  for (const runId of dedupeRunIds(runIds)) {
    index[runId] = chatId;
  }
  saveIndex(agentId, index);
};

export const createChatId = () => crypto.randomUUID();

export const findChatIdByRunId = (
  agentId: AgentUiId,
  runId: string,
): string | null => loadIndex(agentId)[runId] ?? null;

const LEGACY_STORAGE_PREFIX = "blister:agent-chat:";

/** One-time migration from agent-scoped sessionStorage to chat-scoped localStorage. */
export const migrateLegacySession = (
  agentId: AgentUiId,
  runId: string,
): string | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(`${LEGACY_STORAGE_PREFIX}${agentId}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ChatSession;
    const runIds = dedupeRunIds(
      Array.isArray(parsed.runIds) ? parsed.runIds : [],
    );
    if (runIds.length === 0 || !runIds.includes(runId)) return null;

    const nextChatId = createChatId();
    saveSession(agentId, nextChatId, runIds);
    updateIndex(agentId, nextChatId, runIds);
    sessionStorage.removeItem(`${LEGACY_STORAGE_PREFIX}${agentId}`);
    return nextChatId;
  } catch {
    return null;
  }
};

export function useAgentChatSession(
  agentId: AgentUiId,
  chatId: string | null,
) {
  const [sessionRunIds, setSessionRunIds] = useState<string[]>([]);
  const hydratedRef = useRef(false);

  useEffect(() => {
    hydratedRef.current = false;

    if (!chatId) {
      setSessionRunIds([]);
      return;
    }

    setSessionRunIds(loadSession(agentId, chatId));
    hydratedRef.current = true;
  }, [agentId, chatId]);

  useEffect(() => {
    if (!chatId || !hydratedRef.current) return;
    if (sessionRunIds.length === 0) return;
    saveSession(agentId, chatId, sessionRunIds);
    updateIndex(agentId, chatId, sessionRunIds);
  }, [agentId, chatId, sessionRunIds]);

  const appendRun = useCallback((runId: string) => {
    setSessionRunIds((previous) =>
      previous.includes(runId) ? previous : [...previous, runId],
    );
  }, []);

  const resetSession = useCallback(() => {
    setSessionRunIds([]);
    if (chatId) clearSession(agentId, chatId);
  }, [agentId, chatId]);

  const initChat = useCallback(
    (nextChatId: string, runIds: string[]) => {
      const deduped = dedupeRunIds(runIds);
      saveSession(agentId, nextChatId, deduped);
      updateIndex(agentId, nextChatId, deduped);
      hydratedRef.current = true;
      setSessionRunIds(deduped);
    },
    [agentId],
  );

  return {
    sessionRunIds,
    appendRun,
    resetSession,
    initChat,
    setSessionRunIds,
  };
}
