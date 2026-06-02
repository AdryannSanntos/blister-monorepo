"use client";

import React from "react";
import type { UIMessage } from "ai";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Copy,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { DisplayMessage } from "src/core/modules/agents/lib/agent-chat-display-state";
import { Button } from "src/core/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "src/core/shared/components/ui/avatar";
import { cn } from "src/core/shared/utils";
import { Markdown } from "@/components/agent-elements/markdown";
import { ToolGroup } from "@/components/agent-elements/tools/tool-group";
import { UserMessage } from "@/components/agent-elements/user-message";
import { buildToolSections } from "./chat-replay-adapter";
import { ChatThinkingIndicator } from "./chat-thinking-bubble";

type Props = {
  message: DisplayMessage;
  index?: number;
  onEdit?: (message: DisplayMessage) => void;
  onRegenerate?: (message: DisplayMessage) => void;
};

function formatTime(value: string | null) {
  if (!value) return "";
  try {
    return format(new Date(value), "HH:mm", { locale: ptBR });
  } catch {
    return "";
  }
}

function toUserUiMessage(message: DisplayMessage): UIMessage {
  const attachmentParts: UIMessage["parts"] = [];
  for (const attachment of message.attachments) {
    const url =
      attachment.url ??
      (attachment.textContent
        ? `data:${attachment.contentType};charset=utf-8,${encodeURIComponent(attachment.textContent)}`
        : null);
    if (!url) continue;
    attachmentParts.push({
      type: "file",
      filename: attachment.filename,
      mediaType: attachment.contentType,
      url,
    });
  }

  return {
    id: message.id,
    role: "user",
    metadata: { createdAt: message.createdAt ?? undefined },
    parts: [
      ...attachmentParts,
      ...(message.content
        ? [{ type: "text" as const, text: message.content }]
        : []),
    ],
  } as UIMessage;
}

export function ChatStreamMessage({
  message,
  index = 0,
  onEdit,
  onRegenerate,
}: Props) {
  const isUser = message.role === "user";
  const toolSections = isUser ? [] : buildToolSections(message);
  // The same file/context can be cited by more than one underlying RAG document
  // (e.g. a resume uploaded twice). Collapse to one badge per source so the
  // footer never repeats a name — and so React keys stay unique.
  const citations = React.useMemo(() => {
    const seen = new Set<string>();
    return message.citations.filter((citation) => {
      const key = citation.url ?? citation.label;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [message.citations]);
  const hasContent = message.content.length > 0;
  const hasError = message.status === "failed" && Boolean(message.errorMessage);
  // The bubble is a single persistent container: it shows the loading indicator
  // while streaming and swaps to content in place, so there is never a
  // component-level remount (the source of the flash).
  const showBubble =
    !isUser &&
    (hasContent || message.isStreaming || hasError || citations.length > 0);
  const staggerMs = Math.min(index * 45, 180);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Copiado.");
    } catch {
      toast.error("Erro ao copiar.");
    }
  }

  const avatarFallback = isUser ? "VO" : "AI";

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
        {isUser ? (
          <UserMessage message={toUserUiMessage(message)} />
        ) : (
          <>
            {/* Tool group lives outside the message bubble. */}
            {toolSections.length > 0
              ? toolSections.map((section, sectionIndex) => (
                  <div
                    key={
                      section.part.toolCallId ??
                      `${message.id}-tool-${sectionIndex}`
                    }
                    className="ds-chat-content-reveal w-full"
                    style={{ animationDelay: `${sectionIndex * 60}ms` }}
                  >
                    <ToolGroup
                      part={section.part}
                      nestedTools={section.nestedTools}
                      chatStatus={message.isStreaming ? "streaming" : undefined}
                      completeLabel="Contexto consultado"
                      shimmerLabel="Consultando contexto"
                      interruptedLabel="Consulta interrompida"
                      subtitleOverride={
                        typeof section.part.input?.summaryLabel === "string"
                          ? section.part.input.summaryLabel
                          : undefined
                      }
                      defaultOpen={false}
                    />
                  </div>
                ))
              : null}

            {showBubble ? (
              <div className="space-y-4 rounded-an-message bg-an-user-message-bg px-5 py-3 text-sm text-an-user-message-text">
                {hasContent ? (
                  <div
                    key={`${message.id}-${message.content.length}`}
                    className="ds-chat-content-reveal"
                  >
                    <Markdown content={message.content} />
                  </div>
                ) : message.isStreaming ? (
                  <ChatThinkingIndicator />
                ) : null}

                {hasError ? (
                  <p className="text-[12px] text-[var(--destructive)]">
                    {message.errorMessage}
                  </p>
                ) : null}

                {citations.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {citations.map((citation) => {
                      const content = (
                        <>
                          {citation.url ? (
                            <ExternalLink className="size-3" />
                          ) : null}
                          <span className="truncate">{citation.label}</span>
                        </>
                      );
                      const className =
                        "inline-flex max-w-[220px] items-center gap-1 rounded-[var(--r-full)] border border-[var(--line-default)] bg-[var(--bg-raised)] px-2 py-0.5 text-[11px] text-[var(--fg-tertiary)]";
                      return citation.url ? (
                        <a
                          key={`${citation.label}-${citation.url}`}
                          href={citation.url}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            className,
                            "transition-colors hover:text-[var(--fg-primary)]",
                          )}
                        >
                          {content}
                        </a>
                      ) : (
                        <span
                          key={citation.sourceId ?? citation.label}
                          className={className}
                        >
                          {content}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}

        {/* Footer */}
        <div className="-mt-1.5 flex items-center gap-1 px-1 opacity-0 transition-opacity duration-[var(--dur-base)] group-hover:opacity-100 focus-within:opacity-100">
          {!isUser ? (
            <>
              <Avatar
                shape="square"
                className="size-5 rounded-none border border-[var(--line-strong)] bg-[var(--bg-active)]"
              >
                <AvatarFallback className="rounded-none border-0 bg-transparent text-[9px] font-medium text-[var(--fg-secondary)]">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
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
                  {isUser && onEdit ? (
                    <DropdownMenuItem onClick={() => onEdit(message)}>
                      <Pencil className="size-3.5" />
                      Editar
                    </DropdownMenuItem>
                  ) : null}
                  {!isUser && onRegenerate ? (
                    <DropdownMenuItem onClick={() => onRegenerate(message)}>
                      <RefreshCw className="size-3.5" />
                      Regenerar
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="text-[10.5px] tabular-nums text-[var(--fg-quaternary)]">
                {formatTime(message.createdAt)}
              </span>
            </>
          ) : (
            <>
              <span className="text-[10.5px] tabular-nums text-[var(--fg-quaternary)]">
                {formatTime(message.createdAt)}
              </span>
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
                  {isUser && onEdit ? (
                    <DropdownMenuItem onClick={() => onEdit(message)}>
                      <Pencil className="size-3.5" />
                      Editar
                    </DropdownMenuItem>
                  ) : null}
                  {!isUser && onRegenerate ? (
                    <DropdownMenuItem onClick={() => onRegenerate(message)}>
                      <RefreshCw className="size-3.5" />
                      Regenerar
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Copiar mensagem"
                className="size-5 text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
                onClick={handleCopy}
              >
                <Copy className="size-3" />
              </Button>
              <Avatar
                shape="square"
                className="size-5 rounded-none border border-[var(--line-strong)] bg-[var(--bg-active)]"
              >
                <AvatarFallback className="rounded-none border-0 bg-transparent text-[9px] font-medium text-[var(--fg-secondary)]">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
