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
import { ToolRenderer } from "@/components/agent-elements/tools/tool-renderer";
import { ToolRowBase } from "@/components/agent-elements/tools/tool-row-base";
import { UserMessage } from "@/components/agent-elements/user-message";

type Props = {
  message: ChatMessage;
  orgId: string;
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
  onEdit,
  onRegenerate,
}: Props) {
  const isUser = message.role === "user";
  const runIsActive =
    message.agentRun?.status === "queued" || message.agentRun?.status === "running";
  const userMessage: UIMessage = toUserUiMessage(message);
  const toolSections = message.agentRun ? [] : getMessageToolSections(message);

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
        "group flex w-full animate-in fade-in slide-in-from-bottom-1 duration-200",
        isUser ? "justify-end" : "justify-start",
      )}
    >
        <div
          className={cn(
            "flex max-w-[min(100%,54rem)] flex-col gap-2",
            isUser ? "items-end" : "items-start",
          )}
        >
        {isUser ? (
          <div className="max-w-[80%]">
            <UserMessage message={userMessage} />
          </div>
        ) : (
          <div className="w-full overflow-hidden rounded-[var(--r-xl)] border border-[var(--line-default)] bg-[var(--bg-raised)] shadow-[0_8px_28px_color-mix(in_oklch,#000_5%,transparent)]">
            <div className="flex items-center gap-2 border-b border-[var(--line-subtle)] px-5 py-3.5">
              <div className="flex size-8 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Bot className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                  Agente
                </p>
                <p className="text-[11.5px] text-[var(--fg-tertiary)]">
                  {runIsActive ? "Respondendo agora" : "Resposta gerada"}
                </p>
              </div>
            </div>
            <div className="space-y-4 px-5 py-5">
              {message.content ? <Markdown content={message.content} /> : null}

              {toolSections.map((section, index) => (
                <ToolRenderer
                  key={section.part.toolCallId ?? `${message.id}-tool-${index}`}
                  part={section.part}
                  nestedTools={section.nestedTools}
                  chatStatus={runIsActive ? "streaming" : undefined}
                />
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

        {!isUser && message.agentRun && (
          <div className="w-full max-w-md">
            <ExecutionInlineCard run={message.agentRun} orgId={orgId} />
          </div>
        )}

        <div className="flex items-center gap-2 px-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
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
