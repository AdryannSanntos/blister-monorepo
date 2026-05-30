"use client";

import {
  Shield,
  Building2,
  ChevronsUpDown,
  LogOut,
  Moon,
  Plus,
  Sun,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useDashboardData } from "src/core/modules/dashboard/hooks/use-dashboard-data";
import { usePlatformRoleAccess } from "src/core/modules/platform-admin/hooks/use-platform-admin";
import { Avatar, AvatarFallback } from "src/core/shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
import { authClient } from "src/core/shared/utils/auth-client";
import { queryClient } from "src/core/shared/utils/query-client";

type Initials = { value: string };

export function WorkspaceTrigger({
  collapsed,
  workspaceInitials,
}: {
  collapsed: boolean;
  workspaceInitials: string;
}) {
  const router = useRouter();
  const { activeOrganization, organizations, setActiveOrgId } =
    useDashboardData();

  if (!activeOrganization) return null;

  function handleSelect(orgId: string) {
    if (orgId === activeOrganization?.id) return;
    setActiveOrgId(orgId);
    router.push("/dashboard");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            collapsed
              ? "flex size-10 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)]"
              : "flex h-full w-full items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-2.5 text-left"
          }
        >
          <Avatar shape="square" className={collapsed ? "size-8" : "size-10"}>
            <AvatarFallback
              className={collapsed ? "text-[12px]" : "text-[13px]"}
            >
              {workspaceInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                  {activeOrganization.name}
                </p>
                <p className="truncate text-[11.5px] text-[var(--fg-tertiary)]">
                  {activeOrganization.slug}
                </p>
              </div>
              <ChevronsUpDown className="size-3.5 shrink-0 text-[var(--fg-quaternary)]" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem key={org.id} onClick={() => handleSelect(org.id)}>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px] font-medium">
                {org.name}
              </span>
              <span className="truncate text-[11.5px] text-[var(--fg-tertiary)]">
                {org.slug}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/workspaces/create")}>
          <Plus className="size-3.5 text-[var(--fg-tertiary)]" />
          <span className="text-[13px]">Criar novo workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserTrigger({
  collapsed,
  displayName,
  userInitials,
}: {
  collapsed: boolean;
  displayName: string;
  userInitials: string;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { clearActiveOrg } = useDashboardData();
  const { canAccessPlatformAdmin } = usePlatformRoleAccess();

  async function handleSignOut() {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error(error.message ?? "Erro ao sair da conta.");
      return;
    }
    queryClient.clear();
    clearActiveOrg();
    router.push("/auth/login");
    router.refresh();
  }

  return (
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
        {canAccessPlatformAdmin ? (
          <>
            <DropdownMenuItem onClick={() => router.push("/workspaces/admin")}>
              <Shield />
              Admin de plataforma
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem
          onClick={() => router.push("/dashboard/account/settings")}
        >
          <User />
          Configurações da conta
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/workspaces")}>
          <Building2 />
          Minhas empresas
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
          Alternar tema
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type { Initials };
