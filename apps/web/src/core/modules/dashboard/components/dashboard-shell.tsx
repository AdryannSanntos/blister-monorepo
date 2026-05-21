'use client';

import {
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  ChevronsUpDown,
  Coins,
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
  PlugZap,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Sun,
  User,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { getInitials, useDashboardData } from 'src/core/modules/dashboard/hooks/use-dashboard-data';
import { PermissionGate } from 'src/core/shared/components/permission-gate';
import { AppSidebar, type SidebarGroupDef } from 'src/core/shared/components/ui/app-sidebar';
import { Avatar, AvatarFallback } from 'src/core/shared/components/ui/avatar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from 'src/core/shared/components/ui/breadcrumb';
import { Button } from 'src/core/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'src/core/shared/components/ui/dropdown-menu';
import { authClient } from 'src/core/shared/utils/auth-client';
import { queryClient } from 'src/core/shared/utils/query-client';

type DashboardShellProps = {
  children: ReactNode;
};

function getHeaderTitle(pathname: string) {
  if (pathname.startsWith('/dashboard/workspace/team')) return 'Equipe';
  if (pathname.startsWith('/dashboard/workspace/permissions')) return 'Permissões';
  if (pathname.startsWith('/dashboard/workspace/settings')) return 'Configurações do workspace';
  if (pathname.startsWith('/dashboard/workspace/assets')) return 'Brain e assets';
  if (pathname.startsWith('/dashboard/workspace/integrations')) return 'Integrações';
  if (pathname.startsWith('/dashboard/account/settings')) return 'Configurações da conta';
  return 'Dashboard';
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
  const workspaceInitials = getInitials(activeOrganization?.name ?? 'Workspace');
  const headerTitle = getHeaderTitle(pathname);

  async function handleSignOut() {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error(error.message ?? 'Erro ao sair da conta.');
      return;
    }
    queryClient.clear();
    clearActiveOrg();
    router.push('/auth/login');
    router.refresh();
  }

  function handleSelectWorkspace(organizationId: string) {
    if (organizationId === activeOrganization?.id) return;
    setActiveOrgId(organizationId);
    router.push('/app');
  }

  function showComingSoon(label: string) {
    toast.info(`${label} estará disponível em breve.`);
  }

  const sidebarGroups: SidebarGroupDef[] = [
    {
      items: [
        {
          label: 'Dashboard',
          icon: LayoutDashboard,
          href: '/dashboard',
          match: (p) => p === '/dashboard',
        },
      ],
    },
    {
      label: 'Inteligência operacional',
      items: [
        {
          label: 'Brain',
          icon: Brain,
          href: '/onboarding',
          permission: 'company.update' as const,
        },
        {
          label: 'Agentes',
          icon: Shield,
          permission: 'company.update' as const,
          onSelect: () => showComingSoon('Agentes'),
        },
        {
          label: 'Créditos',
          icon: Coins,
          permission: 'company.update' as const,
          onSelect: () => showComingSoon('Créditos'),
        },
        {
          label: 'Fontes do brain',
          icon: BookOpen,
          permission: 'company.update' as const,
          onSelect: () => showComingSoon('Fontes do brain'),
        },
      ],
    },
    {
      label: 'Execução',
      items: [
        {
          label: 'Histórico de execuções',
          icon: Sparkles,
          permission: 'company.update' as const,
          onSelect: () => showComingSoon('Histórico de execuções'),
        },
        {
          label: 'Templates de briefing',
          icon: FileImage,
          permission: 'company.update' as const,
          onSelect: () => showComingSoon('Templates de briefing'),
        },
        {
          label: 'Demandas',
          icon: FileText,
          permission: 'company.update' as const,
          onSelect: () => showComingSoon('Demandas'),
        },
        {
          label: 'Relatórios',
          icon: Megaphone,
          permission: 'company.update' as const,
          onSelect: () => showComingSoon('Relatórios'),
        },
      ],
    },
    {
      label: 'Automações',
      items: [
        {
          label: 'Workflows',
          icon: Zap,
          permission: 'company.update' as const,
          onSelect: () => showComingSoon('Workflows'),
        },
        {
          label: 'Execuções',
          icon: Workflow,
          permission: 'company.update' as const,
          onSelect: () => showComingSoon('Execuções'),
        },
        {
          label: 'Agenda operacional',
          icon: CalendarDays,
          permission: 'company.update' as const,
          onSelect: () => showComingSoon('Agenda'),
        },
        {
          label: 'Alertas',
          icon: Bell,
          permission: 'company.update' as const,
          onSelect: () => showComingSoon('Alertas e relatórios'),
        },
      ],
    },
    {
      label: 'Workspace',
      items: [
        {
          label: 'Equipe',
          icon: Users,
          href: '/dashboard/workspace/team',
          permission: 'member.read' as const,
          match: (p) => p.startsWith('/dashboard/workspace/team'),
        },
        {
          label: 'Permissões',
          icon: Shield,
          href: '/dashboard/workspace/permissions',
          permission: 'role.read' as const,
          match: (p) => p.startsWith('/dashboard/workspace/permissions'),
        },
        {
          label: 'Integrações',
          icon: PlugZap,
          href: '/dashboard/workspace/integrations',
          permission: 'integration.read' as const,
          match: (p) => p.startsWith('/dashboard/workspace/integrations'),
        },
        {
          label: 'Brain assets',
          icon: FolderOpen,
          href: '/dashboard/workspace/assets',
          permission: 'asset.read' as const,
          match: (p) => p.startsWith('/dashboard/workspace/assets'),
        },
        {
          label: 'Configurações',
          icon: Settings,
          href: '/dashboard/workspace/settings',
          permission: 'company.update' as const,
          match: (p) => p.startsWith('/dashboard/workspace/settings'),
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
          meta: `${activeOrganization.slug} · ${organizations.length} workspace${organizations.length > 1 ? 's' : ''}`,
          initials: workspaceInitials,
        }}
        user={{
          name: displayName,
          email: '',
          role: activeRole ?? 'member',
          initials: userInitials,
        }}
        workspaceTrigger={(collapsed) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={
                  collapsed
                    ? 'flex size-10 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)]'
                    : 'flex w-full items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-2.5 text-left'
                }
              >
                <Avatar shape="square" className={collapsed ? 'size-8' : 'size-10'}>
                  <AvatarFallback className={collapsed ? 'text-[12px]' : 'text-[13px]'}>
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
                    <span className="truncate text-[11.5px] text-[var(--fg-tertiary)]">
                      {org.slug}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/workspace/create')}>
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
                    ? 'flex size-10 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)]'
                    : 'flex w-full items-center gap-2.5 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-2 text-left'
                }
              >
                <Avatar className={collapsed ? 'size-8' : 'size-9'}>
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
              <DropdownMenuItem onClick={() => router.push('/dashboard/account/settings')}>
                <User />
                Configurações da conta
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun /> : <Moon />}
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
              aria-label={sidebarOpen ? 'Recolher sidebar' : 'Expandir sidebar'}
              onClick={() => setSidebarOpen((open) => !open)}
            >
              {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
            </Button>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">{activeOrganization.name}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{headerTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2">
            <PermissionGate permission="member.read">
              <Button variant="ghost" size="md" asChild>
                <Link href="/dashboard/workspace/team">
                  <Users />
                  Equipe
                </Link>
              </Button>
            </PermissionGate>
            <PermissionGate permission="company.update">
              <Button size="md" asChild>
                <Link href="/onboarding">
                  <Brain />
                   Brain
                </Link>
              </Button>
            </PermissionGate>
          </div>
        </header>

        <div className="px-8 py-6">{children}</div>
      </div>
    </div>
  );
}
