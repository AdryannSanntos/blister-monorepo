"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  ChevronsUpDown,
  FileImage,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Megaphone,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  PlugZap,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import {
  getInitials,
  useDashboardData,
} from "src/core/modules/dashboard/hooks/use-dashboard-data";
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
  AppSidebar,
  type SidebarGroupDef,
} from "src/core/shared/components/ui/app-sidebar";
import { authClient } from "src/core/shared/utils/auth-client";

type DashboardShellProps = {
  children: ReactNode;
};

function getHeaderTitle(pathname: string) {
  if (pathname.startsWith("/dashboard/invites")) return "Equipe";
  if (pathname.startsWith("/dashboard/workspace/team")) return "Equipe";
  if (pathname.startsWith("/dashboard/workspace/permissions")) return "Permissões";
  if (pathname.startsWith("/dashboard/workspace/settings")) return "Configurações";
  return "Dashboard";
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
  const workspaceInitials = getInitials(activeOrganization?.name ?? "Workspace");
  const headerTitle = getHeaderTitle(pathname);

  async function handleSignOut() {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error(error.message ?? "Erro ao sair da conta.");
      return;
    }
    clearActiveOrg();
    router.push("/auth/login");
    router.refresh();
  }

  function handleSelectWorkspace(organizationId: string) {
    if (organizationId === activeOrganization?.id) return;
    setActiveOrgId(organizationId);
    router.push("/app");
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
      ],
    },
    {
      label: "Inteligência",
      items: [
        { label: "Company Brain", icon: Brain, href: "/onboarding" },
        { label: "Skills", icon: Shield, onSelect: () => showComingSoon("Skills") },
        { label: "Templates", icon: LayoutTemplate, onSelect: () => showComingSoon("Templates") },
        { label: "Biblioteca de contexto", icon: BookOpen, onSelect: () => showComingSoon("Biblioteca de contexto") },
      ],
    },
    {
      label: "Conteúdo e Páginas",
      items: [
        { label: "Content Studio", icon: Sparkles, onSelect: () => showComingSoon("Content Studio") },
        { label: "Visuals", icon: FileImage, onSelect: () => showComingSoon("Visuals") },
        { label: "Pages", icon: FileText, onSelect: () => showComingSoon("Pages") },
        { label: "Campanhas", icon: Megaphone, onSelect: () => showComingSoon("Campanhas") },
      ],
    },
    {
      label: "Automações",
      items: [
        { label: "Automações", icon: Zap, onSelect: () => showComingSoon("Automações") },
        { label: "Execuções", icon: Workflow, onSelect: () => showComingSoon("Execuções") },
        { label: "Agenda", icon: CalendarDays, onSelect: () => showComingSoon("Agenda") },
        { label: "Alertas e relatórios", icon: Bell, onSelect: () => showComingSoon("Alertas e relatórios") },
      ],
    },
    {
      label: "Workspace",
      items: [
        {
          label: "Equipe",
          icon: Users,
          href: "/dashboard/workspace/team",
          match: (p) =>
            p.startsWith("/dashboard/workspace/team") ||
            p.startsWith("/dashboard/invites"),
        },
        {
          label: "Permissões",
          icon: Shield,
          href: "/dashboard/workspace/permissions",
          match: (p) => p.startsWith("/dashboard/workspace/permissions"),
        },
        { label: "Integrações", icon: PlugZap, onSelect: () => showComingSoon("Integrações") },
        { label: "Arquivos e assets", icon: FolderOpen, onSelect: () => showComingSoon("Arquivos e assets") },
        {
          label: "Configurações",
          icon: Settings,
          href: "/dashboard/workspace/settings",
          match: (p) => p.startsWith("/dashboard/workspace/settings"),
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
        onOpenChange={setSidebarOpen}
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
                <Avatar shape="square" className={collapsed ? "size-8" : "size-10"}>
                  <AvatarFallback className={collapsed ? "text-[12px]" : "text-[13px]"}>
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
                <DropdownMenuItem key={org.id} onClick={() => handleSelectWorkspace(org.id)}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-medium">{org.name}</span>
                    <span className="truncate text-[11.5px] text-[var(--fg-tertiary)]">{org.slug}</span>
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/workspace/create")}>
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
                  <AvatarFallback className="text-[11px]">{userInitials}</AvatarFallback>
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
              <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
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

      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-20 flex h-20 shrink-0 items-center justify-between gap-4 border-b border-[var(--line-subtle)] bg-[color-mix(in_oklch,var(--bg-canvas)_92%,transparent)] px-8 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label={sidebarOpen ? "Recolher sidebar" : "Expandir sidebar"}
              onClick={() => setSidebarOpen((open) => !open)}
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

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="md" asChild>
              <Link href="/dashboard/invites">
                <Users />
                Equipe
              </Link>
            </Button>
            <Button size="md" asChild>
              <Link href="/onboarding">
                <Brain />
                Company Brain
              </Link>
            </Button>
          </div>
        </header>

        <div className="px-8 py-6">{children}</div>
      </div>
    </div>
  );
}
