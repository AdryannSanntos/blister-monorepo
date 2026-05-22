"use client";

import {
  Building2,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect } from "react";
import { toast } from "sonner";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { PageTransition } from "src/core/shared/components/page-transition";
import { cn } from "src/core/shared/utils";
import { authClient } from "src/core/shared/utils/auth-client";
import { queryClient } from "src/core/shared/utils/query-client";

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  match: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Minhas empresas",
    icon: Building2,
    href: "/workspaces",
    match: (p) => p === "/workspaces",
  },
  {
    label: "Configurações da conta",
    icon: UserCog,
    href: "/dashboard/account/settings",
    match: (p) => p.startsWith("/dashboard/account/settings"),
  },
];

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session } = authClient.useSession();
  const { activeOrgId, clearActiveOrg } = useActiveOrganization();

  useEffect(() => {
    if (activeOrgId) {
      clearActiveOrg();
    }
  }, [activeOrgId, clearActiveOrg]);
  const displayName =
    session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "Usuário";

  async function handleSignOut() {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error(error.message ?? "Erro ao sair da conta.");
      return;
    }
    queryClient.clear();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="flex h-svh overflow-hidden bg-[var(--bg-canvas)] text-[var(--fg-primary)]">
      {/* Sidebar */}
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-[var(--line-subtle)] bg-[var(--bg-base)] p-3">
        {/* Company selector */}
        <Link
          href="/workspaces"
          className={cn(
            "mb-3 flex items-center gap-3 rounded-[var(--r-md)] border p-2.5 transition-colors",
            "border-dashed border-[var(--line-default)] bg-[var(--bg-sunken)] hover:bg-[var(--bg-raised)]",
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-dashed border-[var(--line-default)]">
            <Building2 className="size-4 text-[var(--fg-quaternary)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-[var(--fg-tertiary)]">
              Nenhuma empresa
            </p>
            <p className="truncate text-[11px] text-[var(--accent)]">
              Selecionar →
            </p>
          </div>
          <ChevronRight className="size-3.5 shrink-0 text-[var(--fg-quaternary)]" />
        </Link>

        <nav className="flex-1 space-y-0.5">
          <p className="mb-1.5 px-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--fg-quaternary)]">
            Workspace
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--r-md)] px-2.5 py-2 text-[13px] transition-colors",
                  isActive
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                    : "text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-0.5 border-t border-[var(--line-subtle)] pt-3">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex w-full items-center gap-2.5 rounded-[var(--r-md)] px-2.5 py-2 text-[13px] text-[var(--fg-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]"
          >
            {theme === "dark" ? (
              <Sun className="size-4 shrink-0" />
            ) : (
              <Moon className="size-4 shrink-0" />
            )}
            Alternar tema
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-[var(--r-md)] px-2.5 py-2 text-[13px] text-[var(--fg-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]"
          >
            <LogOut className="size-4 shrink-0" />
            Sair
          </button>
          <div className="px-2.5 py-2">
            <p className="truncate text-[11.5px] text-[var(--fg-quaternary)]">
              {displayName}
            </p>
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <PageTransition className="flex min-h-full items-center justify-center px-8 py-10">
          {children}
        </PageTransition>
      </div>
    </div>
  );
}
