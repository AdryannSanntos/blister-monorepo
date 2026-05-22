"use client";

import { History, MessageCircle, Settings, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "src/core/shared/utils";

type AgentWorkspaceSidebarProps = {
  agentId: string;
  agentName: string;
};

const navItems = (agentId: string) => [
  {
    key: "chat",
    label: "Chat",
    icon: MessageCircle,
    href: `/dashboard/workspace/agents/${agentId}/chat`,
  },
  {
    key: "workflow",
    label: "Workflow",
    icon: Workflow,
    href: `/dashboard/workspace/agents/${agentId}/workflow`,
  },
  {
    key: "executions",
    label: "Execuções",
    icon: History,
    href: `/dashboard/workspace/agents/${agentId}/executions`,
  },
  {
    key: "settings",
    label: "Configurações",
    icon: Settings,
    href: `/dashboard/workspace/agents/${agentId}/settings`,
  },
];

export function AgentWorkspaceSidebar({
  agentId,
  agentName,
}: AgentWorkspaceSidebarProps) {
  const pathname = usePathname();
  const items = navItems(agentId);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--line-subtle)] px-4 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
          Agente
        </p>
        <p className="mt-1 truncate text-[14px] font-medium text-[var(--fg-primary)]">
          {agentName}
        </p>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-[var(--r-md)] px-3 py-2 text-[13px] transition-colors",
                isActive
                  ? "bg-[var(--bg-active)] font-medium text-[var(--fg-primary)]"
                  : "text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
