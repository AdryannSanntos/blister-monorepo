"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { AgentWorkspacePage } from "src/core/modules/agents/pages/agent-workspace-page";
import {
  useCreateChatThread,
  useSendChatMessage,
} from "src/core/modules/agents/hooks/use-agent-chat";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { Button } from "src/core/shared/components/ui/button";
import { Textarea } from "src/core/shared/components/ui/textarea";

export function AgentChatPageClient({ agentId }: { agentId: string }) {
  const { activeOrgId } = useActiveOrganization();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    Array<{ id: string; role: string; content: string }>
  >([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const createThread = useCreateChatThread(activeOrgId, agentId);
  const sendMessage = useSendChatMessage(activeOrgId, agentId);

  async function handleSend() {
    if (!input.trim() || !activeOrgId || isExecuting) return;

    let currentThreadId = threadId;
    if (!currentThreadId) {
      const thread = await createThread.mutateAsync({
        title: input.slice(0, 80),
      });
      currentThreadId = thread.id;
      setThreadId(currentThreadId);
    }

    const userMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const result = await sendMessage.mutateAsync({
      threadId: currentThreadId,
      content: userMessage.content,
    });

    setMessages((prev) =>
      prev.map((m) =>
        m.id === userMessage.id ? { ...m, id: result.message.id } : m,
      ),
    );

    if (result.run) {
      setIsExecuting(true);
    }
  }

  return (
    <AgentWorkspacePage agentId={agentId}>
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-[15px] font-medium text-[var(--fg-primary)]">
                  Inicie uma conversa
                </p>
                <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
                  Envie uma mensagem para começar a interagir com o agente.
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-[var(--r-lg)] px-4 py-3 text-[13px] ${
                      msg.role === "user"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--bg-raised)] text-[var(--fg-primary)]"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--line-subtle)] p-4">
          <div className="mx-auto flex max-w-3xl gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escreva uma mensagem..."
              disabled={isExecuting}
              rows={1}
              className="min-h-[44px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
            />
            <Button
              onClick={() => void handleSend()}
              disabled={!input.trim() || sendMessage.isPending || isExecuting}
            >
              <Send className="size-4" />
            </Button>
          </div>
          {isExecuting && (
            <p className="mx-auto mt-2 max-w-3xl text-[12px] text-[var(--fg-tertiary)]">
              Execução em andamento — input bloqueado.
            </p>
          )}
        </div>
      </div>
    </AgentWorkspacePage>
  );
}
