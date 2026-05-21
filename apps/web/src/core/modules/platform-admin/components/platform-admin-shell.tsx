"use client";

import {
  BadgeCheck,
  Bot,
  ChartColumn,
  LayoutTemplate,
  Shield,
  Sparkles,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { EmptyState } from "src/core/shared/components/ui/empty-state";
import { cn } from "src/core/shared/utils";
import { usePlatformRoleAccess } from "../hooks/use-platform-admin";

const NAV_ITEMS = [
  { label: "Admins", href: "/workspaces/admin/admins", icon: Shield },
  { label: "Providers", href: "/workspaces/admin/providers", icon: Sparkles },
  { label: "Models", href: "/workspaces/admin/models", icon: Bot },
  { label: "Policies", href: "/workspaces/admin/policies", icon: BadgeCheck },
  {
    label: "Templates",
    href: "/workspaces/admin/templates",
    icon: LayoutTemplate,
  },
  { label: "Runs", href: "/workspaces/admin/runs", icon: Workflow },
  { label: "Costs", href: "/workspaces/admin/costs", icon: ChartColumn },
] as const;

export function PlatformAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { canAccessPlatformAdmin, isLoading } = usePlatformRoleAccess();

  if (isLoading) {
    return (
      <div className="h-full animate-pulse rounded-[var(--r-xl)] border border-[var(--line-default)] bg-[var(--bg-base)]" />
    );
  }

  if (!canAccessPlatformAdmin) {
    return (
      <EmptyState
        icon={Shield}
        title="Acesso restrito"
        description="A área de plataforma é reservada para platform_owner e platform_admin."
        compact
        className="mx-auto max-w-2xl py-24"
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="rounded-[var(--r-xl)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3">
        <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
          Plataforma
        </p>
        <nav className="mt-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--r-md)] px-2.5 py-2 text-[13px] transition-colors",
                  active
                    ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                    : "text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
