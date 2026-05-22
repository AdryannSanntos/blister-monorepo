"use client";

import { Bot, GitBranch } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatMessageBubble } from "src/core/modules/agents/components/chat/chat-message-bubble";
import { RunDetailSheet } from "src/core/modules/agents/components/executions/run-detail-sheet";
import {
  type ChatMessage,
  useAgentMessages,
  useAgentThreads,
  useCreateThread,
  useEditAndBranch,
  useRegenerateMessage,
  useSendMessage,
} from "src/core/modules/agents/hooks/use-agent-chat";
import { useCompanyAgent } from "src/core/modules/agents/hooks/use-agents";
import { useAbility } from "src/core/modules/organization/hooks/use-ability";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { Button } from "src/core/shared/components/ui/button";
import { InputBar } from "@/components/agent-elements/input-bar";

export function AgentChatPage() {
  const params = useParams<{ agentId: string }>();
  const agentId = params.agentId;
  const searchParams = useSearchParams();
  const { activeOrgId } = useActiveOrganization();
  const orgId = activeOrgId ?? "";
  const { can } = useAbility();
  const canExecute = can("create", "AgentRun");
  const agent = useCompanyAgent(orgId, agentId);
  const threads = useAgentThreads(orgId, agentId);
  const [threadIdParam, setThreadIdParam] = useQueryState(
    "thread",
    parseAsString,
  );
  const threadId = threadIdParam ?? searchParams.get("thread");

  const messages = useAgentMessages(orgId, agentId, threadId);
  const createThread = useCreateThread(orgId, agentId);
  const sendMessage = useSendMessage(orgId, agentId);
  const editAndBranch = useEditAndBranch(orgId, agentId);
  const regenerate = useRegenerateMessage(orgId, agentId);

  const [editing, setEditing] = useState<{
    id: string;
    content: string;
  } | null>(null);
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const editingDraft = editing?.content;
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const messagesList = messages.data ?? [];
  const lastMessage = messagesList[messagesList.length - 1];
  const lastRun = lastMessage?.agentRun;
  const isRunActive = Boolean(
    lastRun && (lastRun.status === "queued" || lastRun.status === "running"),
  );

  const currentThread = useMemo(
    () => threads.data?.find((t) => t.id === threadId),
    [threads.data, threadId],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll only when message count changes
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messagesList.length]);

  async function handleSend(content: string) {
    let activeThreadId = threadId;
    if (!activeThreadId) {
      const thread = await createThread.mutateAsync(undefined);
      activeThreadId = thread.id;
      void setThreadIdParam(thread.id);
    }
    await sendMessage.mutateAsync({ threadId: activeThreadId, content });
  }

  function handleEdit(message: ChatMessage) {
    setEditing({ id: message.id, content: message.content });
  }

  async function submitEdit(content: string) {
    if (!threadId || !editing) return;
    const newThread = await editAndBranch.mutateAsync({
      threadId,
      messageId: editing.id,
      content,
    });
    setEditing(null);
    void setThreadIdParam(newThread.id);
  }

  async function handleRegenerate(message: ChatMessage) {
    if (!threadId) return;
    await regenerate.mutateAsync({ threadId, messageId: message.id });
  }

  if (!agent.data && !agent.isLoading) {
    return null;
  }

  const showWelcome =
    !threadId || (messagesList.length === 0 && !messages.isLoading);

  return (
    <div className="flex h-full flex-col bg-[var(--bg-base)]">
      {currentThread?.parentThreadId && (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line-subtle)] bg-[var(--bg-raised)] px-6 py-2">
          <div className="flex items-center gap-2 text-[12px] text-[var(--fg-tertiary)]">
            <GitBranch className="size-3.5" />
            Branch da conversa original
          </div>
          <Button variant="ghost" size="sm" asChild className="h-7 text-[12px]">
            <Link
              href={`/dashboard/workspace/agents/${agentId}/chat?thread=${currentThread.parentThreadId}`}
            >
              Ver original
            </Link>
          </Button>
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {showWelcome ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-[var(--r-full)] bg-[var(--accent-soft)]">
              <Bot className="size-5 text-[var(--accent)]" />
            </div>
            <h1 className="text-[20px] font-medium tracking-[-0.01em] text-[var(--fg-primary)]">
              {agent.data?.name}
            </h1>
            {agent.data?.description && (
              <p className="mt-2 max-w-md text-[13.5px] leading-[1.55] text-[var(--fg-tertiary)]">
                {agent.data.description}
              </p>
            )}
            <p className="mt-3 text-[13px] text-[var(--fg-tertiary)]">
              Escreva uma mensagem para começar. Eu peço o que precisar.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-6">
            {messages.isLoading ? (
              <p className="text-center text-[13px] text-[var(--fg-tertiary)]">
                Carregando mensagens...
              </p>
            ) : (
              messagesList.map((message) => (
                <ChatMessageBubble
                  key={message.id}
                  message={message}
                  onEdit={handleEdit}
                  onRegenerate={handleRegenerate}
                  onOpenRun={setOpenRunId}
                />
              ))
            )}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--line-subtle)] bg-[var(--bg-canvas)] px-6 py-4 shadow-[0_-4px_12px_color-mix(in_oklch,#000_8%,transparent)]">
        <div className="mx-auto max-w-3xl">
          <InputBar
            status={isRunActive ? "streaming" : "ready"}
            onSend={({ content }) =>
              editingDraft !== undefined
                ? void submitEdit(content)
                : void handleSend(content)
            }
            onStop={() => undefined}
            disabled={
              !canExecute ||
              isRunActive ||
              sendMessage.isPending ||
              editAndBranch.isPending
            }
            value={editing ? editing.content : undefined}
            onChange={(v) =>
              editing ? setEditing({ ...editing, content: v }) : undefined
            }
            placeholder={
              editingDraft !== undefined
                ? "Edite sua mensagem..."
                : `Pergunte algo para ${agent.data?.name ?? "o agente"}...`
            }
            infoBar={
              !canExecute
                ? {
                    title: "Visualização somente",
                    description:
                      "Você não tem permissão para enviar mensagens neste agente.",
                    position: "top",
                  }
                : isRunActive
                  ? {
                      title: "Aguardando execução do agente",
                      description:
                        "Você poderá enviar a próxima mensagem assim que esta etapa concluir.",
                      position: "top",
                    }
                  : editing
                    ? {
                        title: "Editando mensagem",
                        description:
                          "Enviar criará um novo branch da conversa.",
                        position: "top",
                        onClose: () => setEditing(null),
                      }
                    : undefined
            }
          />
        </div>
      </div>

      <RunDetailSheet
        open={Boolean(openRunId)}
        onOpenChange={(open) => !open && setOpenRunId(null)}
        orgId={orgId}
        runId={openRunId}
      />
    </div>
  );
}
