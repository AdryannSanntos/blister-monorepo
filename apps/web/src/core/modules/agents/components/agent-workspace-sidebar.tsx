"use client";

import {
  ArrowLeft,
  Bot,
  GitBranch,
  History,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AgentInactiveDialog } from "src/core/modules/agents/components/agent-inactive-dialog";
import {
  useAgentThreads,
  useCreateThread,
  useDeleteThread,
  useRenameThread,
} from "src/core/modules/agents/hooks/use-agent-chat";
import type { Agent } from "src/core/modules/agents/hooks/use-agents";
import { UserTrigger } from "src/core/modules/dashboard/components/sidebar-triggers";
import {
  getInitials,
  useDashboardData,
} from "src/core/modules/dashboard/hooks/use-dashboard-data";
import {
  AppSidebar,
  type SidebarGroupDef,
} from "src/core/shared/components/ui/app-sidebar";
import { ConfirmationDialog } from "src/core/shared/components/ui/confirmation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";

type Props = {
  orgId: string;
  agent: Agent;
  activeThreadId?: string | null;
};

export function AgentWorkspaceSidebar({ orgId, agent, activeThreadId }: Props) {
  const router = useRouter();
  const { displayName, activeOrganization, activeRole } = useDashboardData();
  const threads = useAgentThreads(orgId, agent.id);
  const createThread = useCreateThread(orgId, agent.id);
  const deleteThread = useDeleteThread(orgId, agent.id);
  const renameThread = useRenameThread(orgId, agent.id);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("workana-ai:agent-sidebar-open");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [threadToDelete, setThreadToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [inactiveDialogOpen, setInactiveDialogOpen] = useState(false);
  const isAgentActive = agent.status === "active";
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const basePath = `/dashboard/workspace/agents/${agent.id}`;
  const userInitials = getInitials(displayName);

  async function handleNewThread() {
    if (!isAgentActive) {
      setInactiveDialogOpen(true);
      return;
    }
    const thread = await createThread.mutateAsync(undefined);
    router.push(`${basePath}/chat?thread=${thread.id}`);
  }

  async function handleDeleteThread() {
    if (!threadToDelete) return;
    await deleteThread.mutateAsync(threadToDelete.id);
    if (threadToDelete.id === activeThreadId) {
      router.push(`${basePath}/chat`);
    }
    setThreadToDelete(null);
  }

  function startRename(threadId: string, currentTitle: string) {
    setRenamingThreadId(threadId);
    setRenameDraft(currentTitle || "Conversa sem título");
    setTimeout(() => renameInputRef.current?.focus(), 0);
  }

  async function commitRename() {
    if (!renamingThreadId) return;
    const title = renameDraft.trim();
    if (title) {
      await renameThread.mutateAsync({ threadId: renamingThreadId, title });
    }
    setRenamingThreadId(null);
  }

  const newConversaItem = {
    id: "nova-conversa",
    label: "Nova conversa",
    icon: Plus,
    onSelect: () => void handleNewThread(),
    permission: "agent.execute" as const,
    match: (p: string) => p.startsWith(`${basePath}/chat`) && !activeThreadId,
  };

  const threadItems = (threads.data ?? []).map((thread) => ({
    id: thread.id,
    label:
      renamingThreadId === thread.id ? (
        <input
          ref={renamingThreadId === thread.id ? renameInputRef : undefined}
          value={renameDraft}
          onChange={(e) => setRenameDraft(e.target.value)}
          onBlur={() => void commitRename()}
          onKeyDown={(e) => {
            if (e.key === "Enter") void commitRename();
            if (e.key === "Escape") setRenamingThreadId(null);
            e.stopPropagation();
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-transparent text-[13px] text-[var(--fg-primary)] outline-none"
        />
      ) : (
        (thread.title ?? "Conversa sem título")
      ),
    icon: MessageSquare,
    href:
      renamingThreadId === thread.id
        ? undefined
        : `${basePath}/chat?thread=${thread.id}`,
    permission: "agent.execute" as const,
    active: thread.id === activeThreadId,
    badge: thread.hasActiveRun
      ? { value: "•", tone: "warning" as const }
      : undefined,
    action:
      renamingThreadId !== thread.id ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Abrir menu da conversa ${thread.title ?? "sem título"}`}
              className="flex size-6 items-center justify-center rounded-[var(--r-sm)] text-[var(--fg-quaternary)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => startRename(thread.id, thread.title ?? "")}
            >
              <Pencil className="size-3.5" />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                setThreadToDelete({
                  id: thread.id,
                  title: thread.title ?? "Conversa sem título",
                })
              }
            >
              <Trash2 className="size-3.5" />
              Excluir conversa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null,
  }));

  const sidebarGroups: SidebarGroupDef[] = [
    {
      items: [
        {
          label: "Voltar ao dashboard",
          icon: ArrowLeft,
          href: "/dashboard/workspace/agents",
          action: (
            <button
              type="button"
              aria-label="Fechar sidebar"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSidebarOpen(false);
                try {
                  localStorage.setItem(
                    "workana-ai:agent-sidebar-open",
                    JSON.stringify(false),
                  );
                } catch {}
              }}
              className="flex size-6 items-center justify-center rounded-[var(--r-sm)] text-[var(--fg-quaternary)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]"
            >
              <PanelLeftClose className="size-3.5" />
            </button>
          ),
        },
      ],
    },
    {
      label: agent.name,
      collapsible: false,
      items: [
        {
          label: "Workflow",
          icon: GitBranch,
          href: `${basePath}/workflow`,
          permission: "agent.update" as const,
          match: (p) => p.startsWith(`${basePath}/workflow`),
          badge: !isAgentActive
            ? { value: "!", tone: "warning" as const }
            : undefined,
        },
        {
          label: "Execuções",
          icon: History,
          href: `${basePath}/executions`,
          permission: "agent.run.read" as const,
          match: (p) => p.startsWith(`${basePath}/executions`),
        },
        {
          label: "Configurações",
          icon: Settings,
          href: `${basePath}/settings`,
          permission: "agent.update" as const,
          match: (p) => p.startsWith(`${basePath}/settings`),
        },
      ],
    },
    {
      label: "CONVERSAS",
      collapsible: false,
      items: [newConversaItem, ...threadItems],
      emptyState: undefined,
    },
  ];

  return (
    <>
      <AppSidebar
        defaultOpen
        open={sidebarOpen}
        onOpenChange={(next) => {
          setSidebarOpen(next);
          try {
            localStorage.setItem(
              "workana-ai:agent-sidebar-open",
              JSON.stringify(next),
            );
          } catch {}
        }}
        showToggle={!sidebarOpen}
        fullHeight
        className="shrink-0 p-3"
        groups={sidebarGroups}
        workspace={{
          name: agent.name,
          meta: activeOrganization?.name ?? "",
          initials: getInitials(agent.name),
        }}
        user={{
          name: displayName,
          email: "",
          role: activeRole ?? "member",
          initials: userInitials,
        }}
        workspaceTrigger={(collapsed) =>
          collapsed ? (
            <div className="flex size-10 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] text-[var(--fg-primary)]">
              <Bot className="size-4" />
            </div>
          ) : (
            <div className="flex h-full items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-2.5">
              <div className="flex size-10 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Bot className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                  {agent.name}
                </p>
                <p className="truncate text-[11.5px] text-[var(--fg-tertiary)]">
                  {activeOrganization?.name ?? "Agente"}
                </p>
              </div>
            </div>
          )
        }
        userTrigger={(collapsed) => (
          <UserTrigger
            collapsed={collapsed}
            displayName={displayName}
            userInitials={userInitials}
          />
        )}
      />

      <AgentInactiveDialog
        open={inactiveDialogOpen}
        onOpenChange={setInactiveDialogOpen}
        agentId={agent.id}
        agentName={agent.name}
      />

      <ConfirmationDialog
        open={Boolean(threadToDelete)}
        onOpenChange={(open) => !open && setThreadToDelete(null)}
        title="Excluir conversa"
        description={
          <>
            A conversa <strong>{threadToDelete?.title}</strong> será removida da
            sua lista. Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel={
          deleteThread.isPending ? "Excluindo..." : "Excluir conversa"
        }
        pending={deleteThread.isPending}
        destructive
        onConfirm={handleDeleteThread}
      />
    </>
  );
}
