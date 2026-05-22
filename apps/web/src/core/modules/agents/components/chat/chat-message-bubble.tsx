"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, MoreHorizontal, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ExecutionInlineCard } from "src/core/modules/agents/components/chat/execution-inline-card";
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

type Props = {
  message: ChatMessage;
  onEdit?: (message: ChatMessage) => void;
  onRegenerate?: (message: ChatMessage) => void;
  onOpenRun?: (runId: string) => void;
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
  onEdit,
  onRegenerate,
  onOpenRun,
}: Props) {
  const isUser = message.role === "user";

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
          "flex max-w-[80%] flex-col gap-1",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "rounded-[var(--r-lg)] px-3.5 py-2.5 text-[13.5px] leading-[1.55]",
            isUser
              ? "bg-[var(--bg-raised)] text-[var(--fg-primary)]"
              : "text-[var(--fg-primary)]",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <Markdown content={message.content} />
          )}
        </div>

        {message.agentRun && (
          <div className="w-full max-w-md">
            <ExecutionInlineCard
              run={message.agentRun}
              onClick={() =>
                message.agentRun && onOpenRun?.(message.agentRun.id)
              }
            />
          </div>
        )}

        <div className="flex items-center gap-2 px-1">
          <span className="text-[10.5px] text-[var(--fg-quaternary)] tabular-nums">
            {formatTime(message.createdAt)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Mais ações"
                className="size-5 opacity-0 transition-opacity group-hover:opacity-100"
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
