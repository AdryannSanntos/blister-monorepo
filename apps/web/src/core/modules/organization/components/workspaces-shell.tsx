"use client";

import {
  Building2,
  ChevronsUpDown,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { getInitials } from "src/core/modules/dashboard/hooks/use-dashboard-data";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { usePlatformRoleAccess } from "src/core/modules/platform-admin/hooks/use-platform-admin";
import {
  AppSidebar,
  type SidebarGroupDef,
} from "src/core/shared/components/ui/app-sidebar";
import { Avatar, AvatarFallback } from "src/core/shared/components/ui/avatar";
import { Button } from "src/core/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
import { authClient } from "src/core/shared/utils/auth-client";
import { queryClient } from "src/core/shared/utils/query-client";

export function WorkspacesShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { data: session } = authClient.useSession();
  const { activeOrgId, clearActiveOrg } = useActiveOrganization();
  const { canAccessPlatformAdmin } = usePlatformRoleAccess();

  const sidebarGroups: SidebarGroupDef[] = [
    {
      items: [
        {
          label: "Minhas empresas",
          icon: Building2,
          href: "/workspaces",
          match: (p: string) => p === "/workspaces",
        },
        ...(canAccessPlatformAdmin
          ? [
              {
                label: "Admin de plataforma",
                icon: Settings,
                href: "/workspaces/admin",
                match: (p: string) => p.startsWith("/workspaces/admin"),
              },
            ]
          : []),
        {
          label: "Configurações",
          icon: Settings,
          href: "/workspaces/account/settings",
          match: (p: string) => p.startsWith("/workspaces/account/settings"),
        },
      ],
    },
  ];

  const displayName = session?.user?.name ?? session?.user?.email ?? "Usuário";
  const userInitials = getInitials(displayName);

  useEffect(() => {
    if (activeOrgId) {
      clearActiveOrg();
    }
  }, [activeOrgId, clearActiveOrg]);

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
      <AppSidebar
        defaultOpen
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        fullHeight
        className="shrink-0 p-3"
        groups={sidebarGroups}
        workspaceTrigger={(collapsed) =>
          collapsed ? (
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)]"
            >
              <Avatar shape="square" className="size-8">
                <AvatarFallback className="text-[12px]">
                  <Building2 className="size-4 text-[var(--fg-quaternary)]" />
                </AvatarFallback>
              </Avatar>
            </button>
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-2.5 text-left"
            >
              <Avatar shape="square" className="size-10">
                <AvatarFallback className="text-[13px]">
                  <Building2 className="size-4 text-[var(--fg-quaternary)]" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                  Nenhuma empresa
                </p>
                <p className="truncate text-[11.5px] text-[var(--fg-tertiary)]">
                  Suas empresas
                </p>
              </div>
              <ChevronsUpDown className="size-3.5 shrink-0 text-[var(--fg-quaternary)]" />
            </button>
          )
        }
        user={{
          name: displayName,
          email: "",
          role: "",
          initials: userInitials,
        }}
        userTrigger={(collapsed) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={
                  collapsed
                    ? "flex size-10 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)]"
                    : "flex w-full items-center gap-2.5 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-2 text-left"
                }
              >
                <Avatar className={collapsed ? "size-8" : "size-9"}>
                  <AvatarFallback className="text-[11px]">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                        {displayName}
                      </p>
                    </div>
                    <ChevronsUpDown className="size-3.5 shrink-0 text-[var(--fg-quaternary)]" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => router.push("/workspaces/account/settings")}
              >
                <Settings className="size-4" />
                Configurações da conta
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )}
                Alternar tema
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-[var(--error,#e5484d)] focus:bg-[color-mix(in_oklch,var(--error,#e5484d)_10%,transparent)] focus:text-[var(--error,#e5484d)]"
              >
                <LogOut className="size-4 text-[var(--error,#e5484d)]" />
                Deslogar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-20 flex h-20 shrink-0 items-center justify-between gap-4 border-b border-[var(--line-subtle)] bg-[color-mix(in_oklch,var(--bg-canvas)_92%,transparent)] px-8 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label={sidebarOpen ? "Recolher sidebar" : "Expandir sidebar"}
              onClick={() => setSidebarOpen((o) => !o)}
            >
              {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Configurações da conta"
              asChild
            >
              <Link href="/workspaces/account/settings">
                <Settings className="size-4" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Deslogar"
              onClick={handleSignOut}
              className="text-[var(--error,#e5484d)] hover:bg-[color-mix(in_oklch,var(--error,#e5484d)_10%,transparent)] hover:text-[var(--error,#e5484d)]"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        <div className="px-8 py-8">{children}</div>
      </div>
    </div>
  );
}
