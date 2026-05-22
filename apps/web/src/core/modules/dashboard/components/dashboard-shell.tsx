"use client";

import {
  ArrowLeftRight,
  Bell,
  Bot,
  Brain,
  Building2,
  ChevronsUpDown,
  ClipboardList,
  Coins,
  FileCode2,
  History,
  Image,
  KeyRound,
  LayoutDashboard,
  Library,
  LogOut,
  Mail,
  MessageCircle,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  PlugZap,
  Plus,
  Settings,
  Share2,
  Sun,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import {
  getInitials,
  useDashboardData,
} from "src/core/modules/dashboard/hooks/use-dashboard-data";
import { PageTransition } from "src/core/shared/components/page-transition";
import {
  AppSidebar,
  type SidebarGroupDef,
} from "src/core/shared/components/ui/app-sidebar";
import { Avatar, AvatarFallback } from "src/core/shared/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "src/core/shared/components/ui/breadcrumb";
import { Button } from "src/core/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/core/shared/components/ui/popover";
import { authClient } from "src/core/shared/utils/auth-client";
import { queryClient } from "src/core/shared/utils/query-client";

type DashboardShellProps = {
  children: ReactNode;
};

function getHeaderTitle(pathname: string) {
  if (pathname.startsWith("/dashboard/workspace/brain")) return "Brain";
  if (pathname.startsWith("/dashboard/workspace/context")) return "Contexto";
  if (pathname.startsWith("/dashboard/workspace/assets")) return "Contexto";
  if (pathname.startsWith("/dashboard/workspace/design-system"))
    return "Design System";
  if (pathname.startsWith("/dashboard/workspace/agents")) return "Agentes";
  if (pathname.startsWith("/dashboard/workspace/team")) return "Equipe";
  if (pathname.startsWith("/dashboard/workspace/permissions"))
    return "Permissões";
  if (pathname.startsWith("/dashboard/workspace/settings"))
    return "Configurações do workspace";
  if (pathname.startsWith("/dashboard/workspace/integrations"))
    return "Integrações";
  if (pathname.startsWith("/dashboard/account/settings"))
    return "Configurações da conta";
  if (pathname.startsWith("/dashboard/notifications")) return "Notificações";
  return "Dashboard";
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("workana-ai:sidebar-open");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const {
    displayName,
    activeOrganization,
    activeRole,
    organizations,
    setActiveOrgId,
    clearActiveOrg,
    isLoading,
  } = useDashboardData();

  const userInitials = getInitials(displayName);
  const workspaceInitials = getInitials(
    activeOrganization?.name ?? "Workspace",
  );
  const headerTitle = getHeaderTitle(pathname);

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

  function handleSelectWorkspace(organizationId: string) {
    if (organizationId === activeOrganization?.id) return;
    setActiveOrgId(organizationId);
    router.push("/dashboard");
  }

  function showComingSoon(label: string) {
    toast.info(`${label} estará disponível em breve.`);
  }

  const sidebarGroups: SidebarGroupDef[] = [
    {
      items: [
        {
          label: "Dashboard",
          icon: LayoutDashboard,
          href: "/dashboard",
          match: (p) => p === "/dashboard",
        },
        {
          label: "Chat",
          icon: MessageCircle,
          soon: true,
          onSelect: () => showComingSoon("Chat"),
        },
        {
          label: "Notificações",
          icon: Bell,
          href: "/dashboard/notifications",
          match: (p) => p.startsWith("/dashboard/notifications"),
        },
      ],
    },
    {
      label: "Empresa",
      collapsible: true,
      items: [
        {
          label: "Brain",
          icon: Brain,
          href: "/dashboard/workspace/brain",
          beta: true,
          permission: "brain.read" as const,
          match: (p) => p.startsWith("/dashboard/workspace/brain"),
        },
        {
          label: "Contexto",
          icon: Library,
          href: "/dashboard/workspace/context",
          beta: true,
          permission: "context.read" as const,
          match: (p) =>
            p.startsWith("/dashboard/workspace/context") ||
            p.startsWith("/dashboard/workspace/assets"),
        },
        {
          label: "Design System",
          icon: FileCode2,
          href: "/dashboard/workspace/design-system",
          beta: true,
          permission: "design-system.read" as const,
          match: (p) => p.startsWith("/dashboard/workspace/design-system"),
        },
        {
          label: "Equipe",
          icon: Users,
          href: "/dashboard/workspace/team",
          beta: true,
          permission: "member.read" as const,
          match: (p) => p.startsWith("/dashboard/workspace/team"),
        },
        {
          label: "Permissões",
          icon: KeyRound,
          href: "/dashboard/workspace/permissions",
          beta: true,
          permission: "role.read" as const,
          match: (p) => p.startsWith("/dashboard/workspace/permissions"),
        },
        {
          label: "Configurações",
          icon: Settings,
          href: "/dashboard/workspace/settings",
          beta: true,
          permission: "company.update" as const,
          match: (p) => p.startsWith("/dashboard/workspace/settings"),
        },
        {
          label: "Créditos",
          icon: Coins,
          href: "/dashboard/workspace/agents/credits",
          permission: "credit.read" as const,
          match: (p) => p.startsWith("/dashboard/workspace/agents/credits"),
        },
      ],
    },
    {
      label: "Agentes",
      collapsible: true,
      items: [
        {
          label: "Integrações",
          icon: PlugZap,
          href: "/dashboard/workspace/integrations",
          beta: true,
          permission: "integration.read" as const,
          match: (p) => p.startsWith("/dashboard/workspace/integrations"),
        },
        {
          label: "Meus agentes",
          icon: Bot,
          href: "/dashboard/workspace/agents",
          permission: "agent.read" as const,
          match: (p) => p === "/dashboard/workspace/agents",
        },
        {
          label: "Histórico",
          icon: History,
          href: "/dashboard/workspace/agents/history",
          permission: "agent.run.read" as const,
          match: (p) => p.startsWith("/dashboard/workspace/agents/history"),
        },
      ],
    },
    {
      label: "Automações",
      collapsible: true,
      items: [
        {
          label: "Briefing",
          icon: ClipboardList,
          href: "/dashboard/workspace/agents/analysis",
          permission: "agent.execute" as const,
          match: (p) => p.startsWith("/dashboard/workspace/agents/analysis"),
        },
        {
          label: "Gerar copy",
          icon: PenLine,
          href: "/dashboard/workspace/agents/copy",
          permission: "agent.execute" as const,
          match: (p) => p.startsWith("/dashboard/workspace/agents/copy"),
        },
        {
          label: "Gerar imagem",
          icon: Image,
          href: "/dashboard/workspace/agents/image",
          permission: "agent.execute" as const,
          match: (p) => p.startsWith("/dashboard/workspace/agents/image"),
        },
        {
          label: "Criar post",
          icon: Share2,
          href: "/dashboard/workspace/agents/post",
          permission: "agent.execute" as const,
          match: (p) => p.startsWith("/dashboard/workspace/agents/post"),
        },
        {
          label: "Gerar e-mail",
          icon: Mail,
          href: "/dashboard/workspace/agents/email",
          permission: "agent.execute" as const,
          match: (p) => p.startsWith("/dashboard/workspace/agents/email"),
        },
        {
          label: "Adaptar conteúdo",
          icon: ArrowLeftRight,
          soon: true,
          permission: "agent.execute" as const,
          onSelect: () => showComingSoon("Adaptar conteúdo"),
        },
      ],
    },
  ];

  if (isLoading || !activeOrganization) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-svh overflow-hidden bg-[var(--bg-canvas)] text-[var(--fg-primary)]">
      <AppSidebar
        defaultOpen
        open={sidebarOpen}
        onOpenChange={(next) => {
          setSidebarOpen(next);
          try {
            localStorage.setItem(
              "workana-ai:sidebar-open",
              JSON.stringify(next),
            );
          } catch {}
        }}
        fullHeight
        className="shrink-0 p-3"
        groups={sidebarGroups}
        workspace={{
          name: activeOrganization.name,
          meta: `${activeOrganization.slug} · ${organizations.length} workspace${organizations.length > 1 ? "s" : ""}`,
          initials: workspaceInitials,
        }}
        user={{
          name: displayName,
          email: "",
          role: activeRole ?? "member",
          initials: userInitials,
        }}
        workspaceTrigger={(collapsed) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={
                  collapsed
                    ? "flex size-10 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)]"
                    : "flex w-full items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-2.5 text-left"
                }
              >
                <Avatar
                  shape="square"
                  className={collapsed ? "size-8" : "size-10"}
                >
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
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleSelectWorkspace(org.id)}
                >
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
              <DropdownMenuItem
                onClick={() => router.push("/workspaces/create")}
              >
                <Plus className="size-3.5 text-[var(--fg-tertiary)]" />
                <span className="text-[13px]">Criar novo workspace</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
                onClick={() => router.push("/dashboard/account/settings")}
              >
                <User />
                Configurações da conta
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
        )}
      />

      <div id="dashboard-content" className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-20 flex h-20 shrink-0 items-center justify-between gap-4 border-b border-[var(--line-subtle)] bg-[color-mix(in_oklch,var(--bg-canvas)_92%,transparent)] px-8 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label={sidebarOpen ? "Recolher sidebar" : "Expandir sidebar"}
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
            </Button>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">
                    {activeOrganization.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{headerTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-1">
            {/* Notificações */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Notificações">
                  <Bell className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b border-[var(--line-subtle)] px-4 py-3">
                  <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                    Notificações
                  </p>
                  <button
                    type="button"
                    disabled
                    className="text-[12px] text-[var(--fg-quaternary)] cursor-not-allowed"
                  >
                    Marcar todas como lidas
                  </button>
                </div>
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <Bell className="size-7 text-[var(--fg-quaternary)]" />
                  <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                    Nenhuma notificação
                  </p>
                  <p className="text-[12px] text-[var(--fg-tertiary)]">
                    Você está em dia por aqui.
                  </p>
                </div>
                <div className="border-t border-[var(--line-subtle)] px-4 py-2.5">
                  <Link
                    href="/dashboard/notifications"
                    className="text-[12px] text-[var(--accent)] hover:underline"
                  >
                    Ver todas as notificações →
                  </Link>
                </div>
              </PopoverContent>
            </Popover>

            {/* Configurações da conta */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Configurações da conta"
              asChild
            >
              <Link href="/dashboard/account/settings">
                <Settings className="size-4" />
              </Link>
            </Button>

            {/* Sair */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Sair"
                  className="text-[var(--error,#e5484d)] hover:bg-[color-mix(in_oklch,var(--error,#e5484d)_10%,transparent)] hover:text-[var(--error,#e5484d)]"
                >
                  <LogOut className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => router.push("/workspaces")}>
                  <Building2 className="size-4" />
                  Minhas empresas
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
          </div>
        </header>

        <PageTransition className="px-8 py-6">{children}</PageTransition>
      </div>
    </div>
  );
}
