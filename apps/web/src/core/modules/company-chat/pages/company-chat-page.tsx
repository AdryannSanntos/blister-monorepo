"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { Button } from "src/core/shared/components/ui/button";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { FullFocusLayout } from "src/core/shared/layouts/full-focus-layout";
import { CompanyChatSidebar } from "../components/company-chat-sidebar";
import { useSendCompanyChatMessage } from "../hooks/use-company-chat";

export function CompanyChatPage() {
  const { activeOrgId } = useActiveOrganization();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    Array<{ id: string; role: string; content: string }>
  >([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const sendMessage = useSendCompanyChatMessage(activeOrgId);

  function handleNewChat() {
    setThreadId(null);
    setMessages([]);
    setInput("");
    setIsExecuting(false);
  }

  async function handleSend() {
    if (!input.trim() || !activeOrgId || isExecuting) return;

    const userMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const result = await sendMessage.mutateAsync({
      content: userMessage.content,
      threadId: threadId ?? undefined,
    });

    if (!threadId) {
      setThreadId(result.threadId);
    }

    setMessages((prev) => {
      const updated = prev.map((m) =>
        m.id === userMessage.id
          ? { ...m, id: result.message.id }
          : m,
      );
      return updated;
    });

    if (result.delegatedExecutionId) {
      setIsExecuting(true);
    }
  }

  if (!activeOrgId) return null;

  return (
    <FullFocusLayout
      sidebar={<CompanyChatSidebar onNewChat={handleNewChat} />}
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-[15px] font-medium text-[var(--fg-primary)]">
                  Chat geral da empresa
                </p>
                <p className="mt-1 max-w-md text-[13px] text-[var(--fg-tertiary)]">
                  Converse com o contexto completo da empresa. Pedidos de
                  artefatos finais serão delegados ao agente especializado.
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
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sendMessage.isPending || isExecuting}
            >
              <Send className="size-4" />
            </Button>
          </div>
          {isExecuting && (
            <p className="mx-auto mt-2 max-w-3xl text-[12px] text-[var(--fg-tertiary)]">
              Execução delegada em andamento — input bloqueado.
            </p>
          )}
        </div>
      </div>
    </FullFocusLayout>
  );
}
