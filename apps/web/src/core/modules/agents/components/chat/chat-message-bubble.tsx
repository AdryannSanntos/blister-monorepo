"use client";

import type { UIMessage } from "ai";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, MoreHorizontal, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AgentRunSuspensionCards } from "src/core/modules/agents/components/chat/agent-suspension-card";
import { toUserUiMessage } from "src/core/modules/agents/components/chat/chat-message-parts";
import { isOptimisticMessage } from "src/core/modules/agents/components/chat/chat-optimistic";
import { ChatThinkingBubble } from "src/core/modules/agents/components/chat/chat-thinking-bubble";
import { buildChatToolSections } from "src/core/modules/agents/components/chat/chat-tool-sections";
import { ExecutionInlineCard } from "src/core/modules/agents/components/chat/execution-inline-card";
import {
  parseUiOutputEnvelope,
  UiOutputRenderer,
} from "src/core/modules/agents/components/chat/ui-output-renderer";
import type { ChatMessage } from "src/core/modules/agents/hooks/use-agent-chat";
import { Button } from "src/core/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
import { cn } from "src/core/shared/utils";
import { Markdown } from "@/components/agent-elements/markdown";
import { SpiralLoader } from "@/components/agent-elements/spiral-loader";
import { ToolRenderer } from "@/components/agent-elements/tools/tool-renderer";
import { ToolRowBase } from "@/components/agent-elements/tools/tool-row-base";
import { UserMessage } from "@/components/agent-elements/user-message";

type Props = {
  message: ChatMessage;
  orgId: string;
  index?: number;
  onEdit?: (message: ChatMessage) => void;
  onRegenerate?: (message: ChatMessage) => void;
};

function formatTime(value: string) {
  try {
    return format(new Date(value), "HH:mm", { locale: ptBR });
  } catch {
    return "";
  }
}

export function ChatMessageBubble({
  message,
  orgId,
  index = 0,
  onEdit,
  onRegenerate,
}: Props) {
  const isUser = message.role === "user";
  const isOptimistic = isOptimisticMessage(message);
  const userMessage: UIMessage = toUserUiMessage(message);
  const uiOutputEnvelope = !isUser
    ? parseUiOutputEnvelope(message.metadata)
    : null;
  const toolSections = message.agentRun ? [] : buildChatToolSections(message);
  const runIsActive =
    message.agentRun?.status === "queued" ||
    message.agentRun?.status === "running";
  const showThinking =
    !isUser &&
    !message.content &&
    toolSections.length === 0 &&
    (runIsActive || isOptimistic);
  const staggerMs = Math.min(index * 45, 180);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Copiado.");
    } catch {
      toast.error("Erro ao copiar.");
    }
  }

  return (
    <div
      className={cn(
        "group flex w-full",
        isUser ? "justify-end" : "justify-start",
        isUser ? "ds-chat-message-user-in" : "ds-chat-message-agent-in",
      )}
      style={{ animationDelay: `${staggerMs}ms` }}
    >
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-3",
          isUser ? "items-end" : "items-start",
        )}
      >
        {/* Bubble */}
        {isUser ? (
          <UserMessage message={userMessage} />
        ) : showThinking ? (
          <ChatThinkingBubble />
        ) : (
          <div className="rounded-an-message bg-an-user-message-bg px-5 py-3 text-sm text-an-user-message-text space-y-4">
            {uiOutputEnvelope ? (
              <div
                key={`${message.id}-ui-output`}
                className="ds-chat-content-reveal"
              >
                <UiOutputRenderer envelope={uiOutputEnvelope} />
              </div>
            ) : message.content ? (
              <div
                key={`${message.id}-${message.content.length}`}
                className="ds-chat-content-reveal"
              >
                <Markdown content={message.content} />
              </div>
            ) : null}

            {toolSections.map((section, sectionIndex) => (
              <div
                key={
                  section.part.toolCallId ??
                  `${message.id}-tool-${sectionIndex}`
                }
                className="ds-chat-content-reveal"
                style={{ animationDelay: `${sectionIndex * 60}ms` }}
              >
                <ToolRenderer
                  part={section.part}
                  nestedTools={section.nestedTools}
                  chatStatus={runIsActive ? "streaming" : undefined}
                />
              </div>
            ))}

            {message.agentRun && runIsActive && toolSections.length === 0 ? (
              <ToolRowBase
                icon={<SpiralLoader size={12} />}
                shimmerLabel="Executando etapa"
                completeLabel="Etapa em andamento"
                detail="O agente ainda esta processando esta resposta."
                isAnimating
              />
            ) : null}
          </div>
        )}

        {/* Execution card — below the bubble, outside */}
        {!isUser && message.agentRun && !showThinking && (
          <div className="ds-chat-content-reveal w-full max-w-md space-y-3">
            <ExecutionInlineCard run={message.agentRun} orgId={orgId} />
            {message.agentRunId && (
              <AgentRunSuspensionCards
                runId={message.agentRunId}
                orgId={orgId}
              />
            )}
          </div>
        )}

        {/* Footer — pulled close to the element above */}
        <div className="-mt-1.5 flex items-center gap-2 px-1 opacity-0 transition-opacity duration-[var(--dur-base)] group-hover:opacity-100 focus-within:opacity-100">
          <span className="text-[10.5px] text-[var(--fg-quaternary)] tabular-nums">
            {formatTime(message.createdAt)}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Copiar mensagem"
            className="size-5 text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
            onClick={handleCopy}
          >
            <Copy className="size-3" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Mais ações"
                className="size-5 text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
              >
                <MoreHorizontal className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isUser ? "end" : "start"}>
              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="size-3.5" />
                Copiar
              </DropdownMenuItem>
              {isUser && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(message)}>
                  <Pencil className="size-3.5" />
                  Editar
                </DropdownMenuItem>
              )}
              {!isUser && onRegenerate && (
                <DropdownMenuItem onClick={() => onRegenerate(message)}>
                  <RefreshCw className="size-3.5" />
                  Regenerar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
