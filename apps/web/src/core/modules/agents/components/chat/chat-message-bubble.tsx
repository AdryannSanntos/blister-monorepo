"use client";

import type { UIMessage } from "ai";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bot,
  Copy,
  MoreHorizontal,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { isOptimisticMessage } from "src/core/modules/agents/components/chat/chat-optimistic";
import { ChatThinkingBubble } from "src/core/modules/agents/components/chat/chat-thinking-bubble";
import { ExecutionInlineCard } from "src/core/modules/agents/components/chat/execution-inline-card";
import {
  getMessageToolSections,
  toUserUiMessage,
} from "src/core/modules/agents/components/chat/chat-message-parts";
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
import { TextShimmer } from "@/components/agent-elements/text-shimmer";
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
  const toolSections = message.agentRun ? [] : getMessageToolSections(message);
  const runIsActive =
    message.agentRun?.status === "queued" || message.agentRun?.status === "running";
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
          "flex max-w-[min(100%,54rem)] flex-col gap-4",
          isUser ? "items-end" : "items-start",
        )}
      >
        {isUser ? (
          <div className="max-w-[80%]">
            <UserMessage message={userMessage} />
          </div>
        ) : showThinking ? (
          <ChatThinkingBubble />
        ) : (
          <div className="w-full overflow-hidden rounded-[var(--r-xl)] border border-[var(--line-default)] bg-[var(--bg-raised)] shadow-[0_8px_28px_color-mix(in_oklch,#000_5%,transparent)]">
            <div className="flex items-center gap-2 border-b border-[var(--line-subtle)] px-5 py-3.5">
              <div
                className={cn(
                  "relative flex size-8 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]",
                  runIsActive && "ds-ai-pulse",
                )}
              >
                <Bot className="size-4" />
                {runIsActive ? (
                  <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--bg-raised)]" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                  Agente
                </p>
                {runIsActive ? (
                  <TextShimmer
                    as="p"
                    className="mt-0.5 text-[11.5px] leading-none text-[var(--fg-tertiary)]"
                    duration={1.3}
                  >
                    Respondendo agora
                  </TextShimmer>
                ) : (
                  <p className="mt-0.5 text-[11.5px] text-[var(--fg-tertiary)]">
                    Resposta gerada
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-4 px-5 py-5">
              {message.content ? (
                <div
                  key={`${message.id}-${message.content.length}`}
                  className="ds-chat-content-reveal"
                >
                  <Markdown content={message.content} />
                </div>
              ) : null}

              {toolSections.map((section, sectionIndex) => (
                <div
                  key={section.part.toolCallId ?? `${message.id}-tool-${sectionIndex}`}
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
          </div>
        )}

        {!isUser && message.agentRun && !showThinking && (
          <div className="ds-chat-content-reveal w-full max-w-md">
            <ExecutionInlineCard run={message.agentRun} orgId={orgId} />
          </div>
        )}

        <div className="flex items-center gap-2 px-1 opacity-0 transition-opacity duration-[var(--dur-base)] group-hover:opacity-100 focus-within:opacity-100">
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
