"use client";

import {
  AtSign,
  Bot,
  FileText,
  GitBranch,
  Globe2,
  MessageSquare,
  Mic,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { AgentChatWelcomePrompts } from "src/core/modules/agents/components/chat/agent-chat-welcome-prompts";
import {
  prepareChatAttachments,
  splitComposerAttachments,
} from "src/core/modules/agents/components/chat/chat-attachment-utils";
import { ChatStreamMessage } from "src/core/modules/agents/components/chat/chat-stream-message";
import {
  useAgentThreads,
  useCreateThread,
  useEditAndBranch,
  useRenameThread,
} from "src/core/modules/agents/hooks/use-agent-chat";
import {
  useAgentChatStream,
  useThreadReplay,
} from "src/core/modules/agents/hooks/use-agent-chat-stream";
import { useCompanyAgent } from "src/core/modules/agents/hooks/use-agents";
import type {
  ChatAttachment,
  DisplayMessage,
} from "src/core/modules/agents/lib/agent-chat-display-state";
import { mergeDisplayMessages } from "src/core/modules/agents/lib/agent-chat-display-state";
import { useAbility } from "src/core/modules/organization/hooks/use-ability";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { AgentContentLayout } from "src/core/shared/components/ui/agent-content-layout";
import { Button } from "src/core/shared/components/ui/button";
import { Display } from "src/core/shared/components/ui/display";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
import { cn } from "src/core/shared/utils";
import { InputBar } from "@/components/agent-elements/input-bar";
import { TextShimmer } from "@/components/agent-elements/text-shimmer";

const MAX_ATTACHMENTS = 6;
const FIRST_MESSAGE_TRANSITION_MS = 780;

// Fallback usado apenas para agentes legados que ainda não tiveram as sugestões
// geradas no momento da criação.
const FALLBACK_QUICK_PROMPTS = [
  "Monte um plano de execução para esta demanda",
  "Analise o pedido e me diga o melhor próximo passo",
  "Liste o contexto que você ainda precisa antes de executar",
  "Pesquise referências e resuma o que vale considerar",
  "Transforme esta ideia em um briefing pronto para ação",
];

const QUICK_PROMPT_ICONS = [Sparkles, Search, FileText, Globe2, Bot];

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

  const replay = useThreadReplay(orgId, agentId, threadId);
  const chatStream = useAgentChatStream(orgId, agentId);
  const createThread = useCreateThread(orgId, agentId);
  const editAndBranch = useEditAndBranch(orgId, agentId);
  const renameThread = useRenameThread(orgId, agentId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editing, setEditing] = useState<{
    id: string;
    content: string;
  } | null>(null);
  const [composerDraft, setComposerDraft] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFirstMessageTransitioning, setIsFirstMessageTransitioning] =
    useState(false);
  const [topSectionAnimatedHeight, setTopSectionAnimatedHeight] = useState<
    number | null
  >(null);
  const editingDraft = editing?.content;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const topSectionRef = useRef<HTMLDivElement | null>(null);

  const isStreaming = chatStream.isStreaming;
  const displayMessages = useMemo(
    () =>
      mergeDisplayMessages({
        replay: replay.data?.messages ?? [],
        pendingUser: chatStream.pendingUser,
        streaming: chatStream.streaming,
      }),
    [replay.data, chatStream.pendingUser, chatStream.streaming],
  );

  const currentThread = useMemo(
    () => threads.data?.find((t) => t.id === threadId),
    [threads.data, threadId],
  );

  const showWelcome = !threadId;

  const quickPrompts = useMemo(() => {
    const generated = agent.data?.suggestedMessages;
    const normalizedGenerated = Array.isArray(generated)
      ? generated.filter((item): item is string => Boolean(item?.trim()))
      : [];

    const merged =
      normalizedGenerated.length > 0
        ? [
            ...normalizedGenerated,
            ...FALLBACK_QUICK_PROMPTS.filter(
              (item) => !normalizedGenerated.includes(item),
            ),
          ]
        : [...FALLBACK_QUICK_PROMPTS];

    const prompts = merged.slice(0, 5);
    while (prompts.length < 4) {
      const next = FALLBACK_QUICK_PROMPTS.find((item) => !prompts.includes(item));
      if (!next) break;
      prompts.push(next);
    }
    return prompts;
  }, [agent.data?.suggestedMessages]);

  const showWelcomePanel = showWelcome || isFirstMessageTransitioning;
  const welcomeExpanded = showWelcome;
  const isWelcomeDismissing = isFirstMessageTransitioning && !showWelcome;
  const chatVisible = !showWelcome || isFirstMessageTransitioning;
  const footerIsOpen = showWelcome;

  // Enquanto a primeira mensagem é enviada e o backend gera o título, a thread
  // existe mas ainda não tem `title` — mostramos um shimmer no cabeçalho.
  const isTitlePending = Boolean(
    threadId && currentThread && !currentThread.title && isStreaming,
  );
  const scrollSignal = `${displayMessages.length}:${showWelcome ? "welcome" : "chat"}:${chatStream.streaming?.lastSequence ?? "idle"}`;

  useEffect(() => {
    if (!isWelcomeDismissing) return;

    if (topSectionAnimatedHeight !== null) {
      requestAnimationFrame(() => {
        setTopSectionAnimatedHeight(0);
      });
    }

    const timeoutId = window.setTimeout(() => {
      setIsFirstMessageTransitioning(false);
      setTopSectionAnimatedHeight(null);
    }, FIRST_MESSAGE_TRANSITION_MS);

    return () => {
      window.clearTimeout(timeoutId);
      setTopSectionAnimatedHeight(null);
    };
  }, [isWelcomeDismissing, topSectionAnimatedHeight]);

  useEffect(() => {
    if (!editingTitle) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [editingTitle]);

  useEffect(() => {
    void scrollSignal;
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [scrollSignal]);

  async function handleSend(content: string) {
    const pendingAttachments = attachments;
    setAttachments([]);
    try {
      let activeThreadId = threadId;
      if (!activeThreadId) {
        const sectionHeight = topSectionRef.current?.getBoundingClientRect().height ?? 0;
        if (sectionHeight > 0) {
          setTopSectionAnimatedHeight(sectionHeight);
        }
        setIsFirstMessageTransitioning(true);
        const thread = await createThread.mutateAsync(undefined);
        activeThreadId = thread.id;
        void setThreadIdParam(thread.id);
      }
      await chatStream.send({
        threadId: activeThreadId,
        content,
        attachments: pendingAttachments,
      });
    } catch {
      setIsFirstMessageTransitioning(false);
      setTopSectionAnimatedHeight(null);
      toast.error("Erro ao enviar mensagem.");
    }
  }

  function handleEdit(message: DisplayMessage) {
    setEditing({ id: message.id, content: message.content });
    setAttachments([]);
  }

  async function submitEdit(content: string) {
    if (!threadId || !editing) return;
    const branch = await editAndBranch.mutateAsync({
      threadId,
      messageId: editing.id,
      content,
    });
    setEditing(null);
    void setThreadIdParam(branch.branchId);
    await chatStream.send({ threadId: branch.branchId, content });
  }

  async function handleRegenerate(message: DisplayMessage) {
    if (!threadId) return;
    const index = displayMessages.findIndex((m) => m.id === message.id);
    const priorUser = [...displayMessages.slice(0, index)]
      .reverse()
      .find((m) => m.role === "user");
    if (!priorUser) {
      toast.error("Não encontrei a mensagem original para regenerar.");
      return;
    }
    await chatStream.send({ threadId, content: priorUser.content });
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
      const prepared = await prepareChatAttachments(
        incoming.slice(0, availableSlots),
      );
      setAttachments((current) => [...current, ...prepared]);
      if (incoming.length > availableSlots) {
        toast.message(
          `Somente ${MAX_ATTACHMENTS} anexos podem ser enviados por vez.`,
        );
      }
    } catch {
      toast.error("Não foi possível preparar um dos anexos.");
    }
  }

  const composerAttachments = splitComposerAttachments(attachments);
  const welcomeDescription =
    agent.data?.description?.trim() ??
    "Posso transformar contexto solto em um próximo passo claro, pedir só o que faltar e começar a execução com você.";

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

  const attachMenuActions =
    editingDraft === undefined ? (
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
            <span className="ml-auto text-[10px] text-[var(--fg-quaternary)]">
              Em breve
            </span>
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

  const composer = (
    <>
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
          status={isStreaming ? "streaming" : "ready"}
          outerInset="flush"
          onSend={({ content }) =>
            editingDraft !== undefined
              ? void submitEdit(content)
              : void handleSend(content)
          }
          onStop={() => chatStream.stop()}
          autoFocus={welcomeExpanded && editingDraft === undefined}
          disabled={
            !canExecute ||
            isStreaming ||
            editAndBranch.isPending ||
            createThread.isPending
          }
          value={editing ? editing.content : composerDraft}
          onChange={(value) =>
            editing
              ? setEditing({ ...editing, content: value })
              : setComposerDraft(value)
          }
          attachedImages={composerAttachments.images}
          attachedFiles={composerAttachments.files}
          onRemoveImage={(id) =>
            setAttachments((current) =>
              current.filter((item) => item.id !== id),
            )
          }
          onRemoveFile={(id) =>
            setAttachments((current) =>
              current.filter((item) => item.id !== id),
            )
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
          suggestions={[]}
          infoBar={
            !canExecute
              ? {
                  title: "Visualização somente",
                  description:
                    "Você não tem permissão para enviar mensagens neste agente.",
                  position: "top",
                }
              : isStreaming
                ? {
                    title: "O agente está respondendo",
                    description:
                      "Você poderá enviar a próxima mensagem assim que a resposta concluir.",
                    position: "top",
                  }
                : editing
                  ? {
                      title: "Editando mensagem",
                      description: "Enviar criará um novo branch da conversa.",
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
    </>
  );

  return (
    <AgentContentLayout
      icon={MessageSquare}
      title={
        threadId && currentThread ? (
          isTitlePending ? (
            <TextShimmer
              as="span"
              className="text-[15px] font-medium"
              duration={1.4}
            >
              Gerando título…
            </TextShimmer>
          ) : editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                if (titleDraft.trim()) {
                  void renameThread.mutateAsync({
                    threadId,
                    title: titleDraft.trim(),
                  });
                }
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (titleDraft.trim()) {
                    void renameThread.mutateAsync({
                      threadId,
                      title: titleDraft.trim(),
                    });
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
              onClick={() => {
                setTitleDraft(currentThread.title ?? "Conversa sem título");
                setEditingTitle(true);
              }}
              className="group inline-flex min-w-0 cursor-pointer items-center gap-1.5 truncate text-left text-[15px] font-medium text-[var(--fg-primary)] transition-colors hover:text-[var(--accent)]"
              title="Clique para renomear"
            >
              <span className="truncate">
                {currentThread.title ?? "Conversa sem título"}
              </span>
              <Pencil className="size-3 shrink-0 text-[var(--fg-quaternary)] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
            </button>
          )
        ) : (
          (agent.data?.name ?? "Agente")
        )
      }
      subtitle={
        threadId && currentThread
          ? (agent.data?.name ?? "Workana AI")
          : (agent.data?.description ?? "Workana AI")
      }
      banner={branchBanner}
      contentClassName="flex min-h-0 flex-1 flex-col [--chat-content-width:860px]"
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_38%),var(--bg-base)]">
        <div
          ref={scrollRef}
          className={cn(
            "relative min-h-0 w-full flex-1 overflow-y-auto",
            !chatVisible && "pointer-events-none opacity-0",
          )}
        >
          <AnimatePresence>
            {chatVisible ? (
              <motion.div
                key="chat-messages"
                initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 12 }}
                transition={{
                  opacity: { duration: 0.38, delay: 0.12 },
                  y: { duration: 0.48, delay: 0.08, ease: [0, 0, 0.2, 1] },
                  filter: { duration: 0.35, delay: 0.1 },
                }}
                className="mx-auto flex w-full max-w-[var(--chat-content-width)] flex-col gap-6 px-6 py-6"
              >
                {replay.isLoading && displayMessages.length === 0 ? (
                  <div className="flex justify-center py-10">
                    <TextShimmer
                      as="p"
                      className="text-[13px] text-[var(--fg-tertiary)]"
                      duration={1.3}
                    >
                      Carregando conversa...
                    </TextShimmer>
                  </div>
                ) : (
                  displayMessages.map((message, index) => (
                    <ChatStreamMessage
                      key={message.id}
                      message={message}
                      index={index}
                      onEdit={handleEdit}
                      onRegenerate={handleRegenerate}
                    />
                  ))
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

          <fieldset
            aria-label={
              showWelcomePanel ? "Composer inicial do chat" : "Composer do chat"
            }
            className={cn(
              "relative z-20 mt-auto flex w-full shrink-0 flex-col overflow-hidden rounded-t-[28px] border border-b-0 border-[var(--line-subtle)] bg-[var(--bg-canvas)] p-0 shadow-[0_-16px_40px_color-mix(in_oklch,#000_20%,transparent)]",
              footerIsOpen ? "h-[85%] min-h-0" : "h-auto",
            )}
            onDragOver={(event) => {
              event.preventDefault();
              if (editingDraft !== undefined) return;
              setIsDragOver(true);
            }}
            onDragLeave={(event) => {
              if (
                !event.currentTarget.contains(event.relatedTarget as Node | null)
              ) {
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
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,color-mix(in_oklch,var(--accent)_2%,transparent)_0%,transparent_34%),radial-gradient(circle_at_18%_76%,color-mix(in_oklch,var(--accent)_1%,transparent)_0%,transparent_40%),linear-gradient(180deg,var(--bg-base),var(--bg-canvas))]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--bg-base)_98%,transparent),var(--bg-canvas))]" />
            <div className="absolute inset-0 [background-image:linear-gradient(color-mix(in_oklch,var(--line-subtle)_97%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklch,var(--line-subtle)_97%,transparent)_1px,transparent_1px)] [background-size:30px_30px] [mask-image:radial-gradient(ellipse_at_center,#000_56%,transparent_100%)] opacity-[0.08]" />
            <motion.div
              aria-hidden
              className="absolute -inset-x-24 bottom-0 h-28 opacity-[0.08]"
              style={{
                background:
                  "linear-gradient(180deg,transparent 0%,color-mix(in_oklch,var(--accent)_2%,transparent) 100%)",
                maskImage:
                  "repeating-radial-gradient(140% 80% at 50% 100%, #000 0 2px, transparent 2px 16px)",
                WebkitMaskImage:
                  "repeating-radial-gradient(140% 80% at 50% 100%, #000 0 2px, transparent 2px 16px)",
              }}
              animate={{ x: [0, 24, 0], opacity: [0.55, 0.85, 0.55] }}
              transition={{
                duration: 9,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-end">
            <AnimatePresence>
              {showWelcomePanel ? (
                <motion.div
                  ref={topSectionRef}
                  key="welcome-content"
                  initial={false}
                  animate={
                    topSectionAnimatedHeight !== null
                      ? {
                          height: topSectionAnimatedHeight,
                          opacity: isWelcomeDismissing ? 0 : 1,
                          y: isWelcomeDismissing ? -10 : 0,
                          scale: isWelcomeDismissing ? 0.985 : 1,
                          filter: isWelcomeDismissing
                            ? "blur(10px)"
                            : "blur(0px)",
                        }
                      : isWelcomeDismissing
                      ? {
                          opacity: 0,
                          y: -10,
                          scale: 0.985,
                          filter: "blur(10px)",
                        }
                      : {
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          filter: "blur(0px)",
                        }
                  }
                  exit={{ opacity: 0 }}
                  transition={
                    isWelcomeDismissing
                      ? {
                          height: {
                            duration: FIRST_MESSAGE_TRANSITION_MS / 1000,
                            ease: [0, 0, 0.2, 1],
                          },
                          opacity: { duration: 0.34, ease: "easeOut" },
                          y: { duration: 0.38, ease: "easeOut" },
                          scale: { duration: 0.38, ease: "easeOut" },
                          filter: { duration: 0.42, ease: "easeOut" },
                        }
                      : { duration: 0.18 }
                  }
                  className={cn(
                    "relative z-10 overflow-hidden px-6 pt-8",
                    topSectionAnimatedHeight !== null
                      ? "min-h-0 flex-none"
                      : "min-h-0 flex-1",
                  )}
                  style={
                    {
                      WebkitMaskImage:
                        "radial-gradient(circle at center, #000 0%, #000 62%, transparent 100%), repeating-radial-gradient(circle at center, #000 0 10px, transparent 12px 28px)",
                      WebkitMaskSize: isWelcomeDismissing
                        ? "100% 100%, 36px 36px"
                        : "100% 100%, 24px 24px",
                      WebkitMaskRepeat: "no-repeat, repeat",
                      maskImage:
                        "radial-gradient(circle at center, #000 0%, #000 62%, transparent 100%), repeating-radial-gradient(circle at center, #000 0 10px, transparent 12px 28px)",
                      maskSize: isWelcomeDismissing
                        ? "100% 100%, 36px 36px"
                        : "100% 100%, 24px 24px",
                      maskRepeat: "no-repeat, repeat",
                    }
                  }
                >
                  <div className="mx-auto flex h-full w-full max-w-[var(--chat-content-width)] flex-col justify-center gap-6 pb-6">
                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
                      className="max-w-xl space-y-2"
                    >
                      <Display
                        level="d3"
                        as="h2"
                        className="truncate whitespace-nowrap text-[32px] leading-[1.12] not-italic tracking-[0.01em] text-[var(--fg-secondary)]"
                      >
                        Olá, eu sou{" "}
                        <TextShimmer
                          as="span"
                          className="[background-image:linear-gradient(90deg,var(--fg-secondary)_0%,var(--fg-secondary)_42%,var(--fg-primary)_50%,var(--fg-secondary)_58%,var(--fg-secondary)_100%)]"
                          duration={1.6}
                        >
                          {agent.data?.name ?? "seu agente"}
                        </TextShimmer>
                        .
                      </Display>
                      <p className="text-[13px] leading-[1.6] text-[var(--fg-tertiary)]">
                        {welcomeDescription}
                      </p>
                    </motion.div>

                    <AgentChatWelcomePrompts
                      prompts={quickPrompts}
                      icons={QUICK_PROMPT_ICONS}
                      disabled={!canExecute || isStreaming}
                      onSelect={(prompt) => void handleSend(prompt)}
                    />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="relative z-20 shrink-0 px-6 py-4">
              {composer}
            </div>
          </div>
          </fieldset>
      </div>
    </AgentContentLayout>
  );
}
