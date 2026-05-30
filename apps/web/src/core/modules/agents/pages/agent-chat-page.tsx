"use client";

import { AtSign, Bot, FileText, GitBranch, MessageSquare, Mic, Paperclip, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  prepareChatAttachments,
  splitComposerAttachments,
} from "src/core/modules/agents/components/chat/chat-attachment-utils";
import { ChatMessageBubble } from "src/core/modules/agents/components/chat/chat-message-bubble";
import {
  buildOptimisticAssistantMessage,
  buildOptimisticUserMessage,
} from "src/core/modules/agents/components/chat/chat-optimistic";
import {
  type ChatAttachment,
  type ChatMessage,
  useAgentMessages,
  useAgentThreads,
  useCreateThread,
  useEditAndBranch,
  useRegenerateMessage,
  useRenameThread,
  useSendMessage,
} from "src/core/modules/agents/hooks/use-agent-chat";
import { useCompanyAgent } from "src/core/modules/agents/hooks/use-agents";
import { useAbility } from "src/core/modules/organization/hooks/use-ability";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { AgentContentLayout } from "src/core/shared/components/ui/agent-content-layout";
import { Button } from "src/core/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
import { InputBar } from "@/components/agent-elements/input-bar";
import { SpiralLoader } from "@/components/agent-elements/spiral-loader";
import { ToolRowBase } from "@/components/agent-elements/tools/tool-row-base";

const MAX_ATTACHMENTS = 6;

const QUICK_PROMPTS = [
  "Monte um plano de execução para esta demanda",
  "Gere a primeira resposta já com tom profissional",
  "Liste o contexto que você ainda precisa antes de executar",
];

export function AgentChatPage() {
  const params = useParams<{ agentId: string }>();
  const agentId = params.agentId;
  const { activeOrgId } = useActiveOrganization();
  const orgId = activeOrgId ?? "";
  const { can } = useAbility();
  const canExecute = can("create", "AgentRun");
  const agent = useCompanyAgent(orgId, agentId);
  const threads = useAgentThreads(orgId, agentId);
  const [threadId, setThreadIdParam] = useQueryState("thread", parseAsString);

  const messages = useAgentMessages(orgId, agentId, threadId);
  const createThread = useCreateThread(orgId, agentId);
  const sendMessage = useSendMessage(orgId, agentId);
  const editAndBranch = useEditAndBranch(orgId, agentId);
  const regenerate = useRegenerateMessage(orgId, agentId);
  const renameThread = useRenameThread(orgId, agentId);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editing, setEditing] = useState<{
    id: string;
    content: string;
  } | null>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [outbox, setOutbox] = useState<ChatMessage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const editingDraft = editing?.content;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const messagesList = messages.data ?? [];
  const displayMessages = useMemo(() => {
    if (outbox.length === 0) return messagesList;
    const serverIds = new Set(messagesList.map((message) => message.id));
    const pending = outbox.filter((message) => !serverIds.has(message.id));
    return [...messagesList, ...pending];
  }, [messagesList, outbox]);
  const lastMessage = displayMessages[displayMessages.length - 1];
  const lastRun = lastMessage?.agentRun;
  const isRunActive = Boolean(
    lastRun && (lastRun.status === "queued" || lastRun.status === "running"),
  );

  const currentThread = useMemo(
    () => threads.data?.find((t) => t.id === threadId),
    [threads.data, threadId],
  );

  const showWelcome =
    !threadId || (displayMessages.length === 0 && !messages.isLoading && outbox.length === 0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [displayMessages.length, showWelcome, outbox.length]);

  async function handleSend(content: string) {
    const pendingAttachments = attachments;
    const optimisticUser = buildOptimisticUserMessage(content, pendingAttachments);
    const optimisticAssistant = buildOptimisticAssistantMessage();
    setOutbox([optimisticUser, optimisticAssistant]);
    setAttachments([]);

    try {
      let activeThreadId = threadId;
      if (!activeThreadId) {
        const thread = await createThread.mutateAsync(undefined);
        activeThreadId = thread.id;
        void setThreadIdParam(thread.id);
      }
      await sendMessage.mutateAsync({
        threadId: activeThreadId,
        content,
        attachments: pendingAttachments,
      });
    } finally {
      setOutbox([]);
    }
  }

  function handleEdit(message: ChatMessage) {
    setEditing({ id: message.id, content: message.content });
    setAttachments([]);
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

  async function appendFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const incoming = Array.from(fileList);
    const availableSlots = Math.max(0, MAX_ATTACHMENTS - attachments.length);

    if (availableSlots === 0) {
      toast.error(`Limite de ${MAX_ATTACHMENTS} anexos por mensagem.`);
      return;
    }

    try {
      const prepared = await prepareChatAttachments(incoming.slice(0, availableSlots));
      setAttachments((current) => [...current, ...prepared]);
      if (incoming.length > availableSlots) {
        toast.message(`Somente ${MAX_ATTACHMENTS} anexos podem ser enviados por vez.`);
      }
    } catch {
      toast.error("Não foi possível preparar um dos anexos.");
    }
  }

  const composerAttachments = splitComposerAttachments(attachments);

  if (!agent.data && !agent.isLoading) {
    return null;
  }

  const branchBanner = currentThread?.parentThreadId ? (
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
  ) : null;

  const attachMenuActions = editingDraft === undefined ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md text-an-foreground-muted hover:bg-an-background-secondary hover:text-an-foreground transition-colors duration-100"
          aria-label="Mais opções"
        >
          <Plus className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-48">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-[var(--fg-quaternary)]">
          Anexar
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            fileInputRef.current?.setAttribute("accept", "image/*");
            fileInputRef.current?.click();
          }}
        >
          <Paperclip className="size-3.5" />
          Imagem ou arquivo
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            fileInputRef.current?.setAttribute(
              "accept",
              ".txt,.md,.markdown,.json,.csv,.tsv,.html,.xml,.js,.ts,.tsx,.jsx,.pdf",
            );
            fileInputRef.current?.click();
          }}
        >
          <FileText className="size-3.5" />
          Documento
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="whitespace-nowrap">
          <AtSign className="size-3.5" />
          Mencionar contexto
          <span className="ml-auto text-[10px] text-[var(--fg-quaternary)]">Em breve</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  const micButton = (
    <button
      type="button"
      disabled
      className="inline-flex size-7 items-center justify-center rounded-md text-an-foreground-muted opacity-40 cursor-not-allowed"
      title="Microfone (em breve)"
      aria-label="Microfone"
    >
      <Mic className="size-3.5" />
    </button>
  );

  return (
    <AgentContentLayout
      icon={MessageSquare}
      title={
        threadId && currentThread ? (
          editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                if (titleDraft.trim()) {
                  void renameThread.mutateAsync({ threadId, title: titleDraft.trim() });
                }
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (titleDraft.trim()) {
                    void renameThread.mutateAsync({ threadId, title: titleDraft.trim() });
                  }
                  setEditingTitle(false);
                }
                if (e.key === "Escape") setEditingTitle(false);
              }}
              className="min-w-0 w-full bg-transparent text-[15px] font-medium text-[var(--fg-primary)] outline-none border-b border-[var(--accent)] focus:border-[var(--accent)]"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <button
              type="button"
              onClick={() => { setTitleDraft(currentThread.title ?? "Conversa sem título"); setEditingTitle(true); }}
              className="group inline-flex min-w-0 cursor-pointer items-center gap-1.5 truncate text-left text-[15px] font-medium text-[var(--fg-primary)] transition-colors hover:text-[var(--accent)]"
              title="Clique para renomear"
            >
              <span className="truncate">{currentThread.title ?? "Conversa sem título"}</span>
              <Pencil className="size-3 shrink-0 text-[var(--fg-quaternary)] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
            </button>
          )
        ) : (agent.data?.name ?? "Agente")
      }
      subtitle={threadId && currentThread ? (agent.data?.name ?? "Workana AI") : (agent.data?.description ?? "Workana AI")}
      banner={branchBanner}
      contentClassName="flex min-h-0 flex-1 flex-col [--chat-content-width:860px]"
    >
      <div
        ref={scrollRef}
        className="min-h-0 w-full flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.08),transparent_34%),var(--bg-base)]"
      >
        {showWelcome ? (
          <div className="flex h-full min-h-[240px] items-center justify-center p-8">
            <div className="w-full max-w-sm rounded-[var(--r-2xl)] border border-[var(--line-default)] bg-[var(--bg-raised)] px-8 py-7 text-center shadow-[0_18px_48px_color-mix(in_oklch,#000_8%,transparent)] animate-in fade-in-0 zoom-in-95 duration-300">
              <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-[var(--r-full)] bg-[var(--accent-soft)]">
                <Bot className="size-5 text-[var(--accent)]" />
              </div>
              <h2 className="text-[18px] font-medium tracking-[-0.02em] text-[var(--fg-primary)]">
                {agent.data?.name}
              </h2>
              <p className="mt-2.5 text-[12.5px] leading-[1.6] text-[var(--fg-tertiary)]">
                Comece pela demanda em linguagem natural. O agente pede contexto
                adicional apenas quando precisar.
              </p>
              {agent.data?.description ? (
                <p className="mt-1.5 text-[12px] leading-[1.6] text-[var(--fg-quaternary)]">
                  {agent.data.description}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[var(--chat-content-width)] flex-col gap-6 px-6 py-6">
            {messages.isLoading ? (
              <div className="flex justify-center py-10">
                <ToolRowBase
                  icon={<SpiralLoader size={12} />}
                  shimmerLabel="Carregando conversa"
                  completeLabel="Conversa carregada"
                  detail="Buscando as mensagens mais recentes."
                  isAnimating
                />
              </div>
            ) : (
              displayMessages.map((message, index) => (
                <ChatMessageBubble
                  key={message.id}
                  message={message}
                  orgId={orgId}
                  index={index}
                  onEdit={handleEdit}
                  onRegenerate={handleRegenerate}
                />
              ))
            )}
          </div>
        )}
      </div>

      <div
        className="relative border-t border-[var(--line-subtle)] bg-[var(--bg-canvas)] shadow-[0_-4px_12px_color-mix(in_oklch,#000_8%,transparent)]"
        onDragOver={(event) => {
          event.preventDefault();
          if (editingDraft !== undefined) return;
          setIsDragOver(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragOver(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          if (editingDraft !== undefined) return;
          void appendFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept="image/*,.txt,.md,.markdown,.json,.csv,.tsv,.html,.xml,.js,.ts,.tsx,.jsx,.pdf"
          onChange={(event) => {
            void appendFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <div className="w-full">
          <InputBar
            className="[--an-max-width:var(--chat-content-width)]"
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
            attachedImages={composerAttachments.images}
            attachedFiles={composerAttachments.files}
            onRemoveImage={(id) =>
              setAttachments((current) => current.filter((item) => item.id !== id))
            }
            onRemoveFile={(id) =>
              setAttachments((current) => current.filter((item) => item.id !== id))
            }
            onPaste={(event) => {
              if (editingDraft !== undefined) return;
              const files = event.clipboardData.files;
              if (files.length > 0) {
                event.preventDefault();
                void appendFiles(files);
              }
            }}
            isDragOver={isDragOver}
            placeholder={
              editingDraft !== undefined
                ? "Edite sua mensagem..."
                : `Pergunte algo para ${agent.data?.name ?? "o agente"}...`
            }
            leftActions={attachMenuActions}
            rightActions={micButton}
            suggestions={{
              items: showWelcome
                ? QUICK_PROMPTS.map((prompt) => ({
                    id: prompt,
                    label: prompt,
                    value: prompt,
                  }))
                : [],
              className: "flex-nowrap overflow-x-auto [scrollbar-width:thin]",
              itemClassName: "shrink-0",
            }}
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
                    : attachments.length > 0
                      ? {
                          title: `${attachments.length} anexo${attachments.length === 1 ? "" : "s"} pronto${attachments.length === 1 ? "" : "s"}`,
                          description:
                            "Os arquivos seguem junto com a próxima mensagem para dar contexto ao agente.",
                          position: "top",
                        }
                    : undefined
            }
          />
        </div>
      </div>

    </AgentContentLayout>
  );
}
