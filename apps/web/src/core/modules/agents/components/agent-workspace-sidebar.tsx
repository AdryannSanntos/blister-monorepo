"use client";

import {
  ArrowLeft,
  GitBranch,
  History,
  MessageCircle,
  MessageSquare,
  Plus,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useAgentThreads,
  useCreateThread,
} from "src/core/modules/agents/hooks/use-agent-chat";
import type { Agent } from "src/core/modules/agents/hooks/use-agents";
import {
  UserTrigger,
  WorkspaceTrigger,
} from "src/core/modules/dashboard/components/sidebar-triggers";
import {
  getInitials,
  useDashboardData,
} from "src/core/modules/dashboard/hooks/use-dashboard-data";
import {
  AppSidebar,
  type SidebarGroupDef,
} from "src/core/shared/components/ui/app-sidebar";

type Props = {
  orgId: string;
  agent: Agent;
  activeThreadId?: string | null;
  hasActiveRun?: boolean;
};

export function AgentWorkspaceSidebar({
  orgId,
  agent,
  activeThreadId,
  hasActiveRun,
}: Props) {
  const router = useRouter();
  const { displayName, activeOrganization, activeRole } = useDashboardData();
  const threads = useAgentThreads(orgId, agent.id);
  const createThread = useCreateThread(orgId, agent.id);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("workana-ai:agent-sidebar-open");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const basePath = `/dashboard/workspace/agents/${agent.id}`;
  const userInitials = getInitials(displayName);
  const workspaceInitials = getInitials(
    activeOrganization?.name ?? "Workspace",
  );

  async function handleNewThread() {
    const thread = await createThread.mutateAsync(undefined);
    router.push(`${basePath}/chat?thread=${thread.id}`);
  }

  const threadItems = (threads.data ?? []).map((thread) => ({
    label: thread.title ?? "Conversa sem título",
    icon: MessageSquare,
    href: `${basePath}/chat?thread=${thread.id}`,
    permission: "agent.execute" as const,
    active: thread.id === activeThreadId,
  }));

  const sidebarGroups: SidebarGroupDef[] = [
    {
      items: [
        {
          label: "Voltar ao dashboard",
          icon: ArrowLeft,
          href: "/dashboard/workspace/agents",
        },
      ],
    },
    {
      label: agent.name,
      collapsible: false,
      items: [
        {
          label: "Chat",
          icon: MessageCircle,
          href: `${basePath}/chat`,
          permission: "agent.read" as const,
          match: (p) => p.startsWith(`${basePath}/chat`),
          badge: hasActiveRun
            ? { value: "•", tone: "warning" as const }
            : undefined,
        },
        {
          label: "Workflow",
          icon: GitBranch,
          href: `${basePath}/workflow`,
          permission: "agent.update" as const,
          match: (p) => p.startsWith(`${basePath}/workflow`),
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
      label: "Conversas",
      collapsible: true,
      items: [
        {
          label: "Nova conversa",
          icon: Plus,
          onSelect: () => void handleNewThread(),
          permission: "agent.execute" as const,
        },
        ...threadItems,
      ],
    },
  ];

  return (
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
      fullHeight
      className="shrink-0 p-3"
      groups={sidebarGroups}
      workspace={{
        name: activeOrganization?.name ?? "Workspace",
        meta: activeOrganization?.slug ?? "",
        initials: workspaceInitials,
      }}
      user={{
        name: displayName,
        email: "",
        role: activeRole ?? "member",
        initials: userInitials,
      }}
      workspaceTrigger={(collapsed) => (
        <WorkspaceTrigger
          collapsed={collapsed}
          workspaceInitials={workspaceInitials}
        />
      )}
      userTrigger={(collapsed) => (
        <UserTrigger
          collapsed={collapsed}
          displayName={displayName}
          userInitials={userInitials}
        />
      )}
    />
  );
}
