"use client";

import type { AppPermissionKey } from "@company-os/authz";
import { permissionMap } from "@company-os/authz";
import {
  Bell,
  Brain,
  ChevronRight,
  ChevronsUpDown,
  Coins,
  FileText,
  FolderOpen,
  Home,
  Image,
  KeyRound,
  LayoutTemplate,
  Library,
  type LucideIcon,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  PlugZap,
  Settings,
  Shield,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useAbility } from "src/core/modules/organization/hooks/use-ability";
import { Avatar, AvatarFallback } from "src/core/shared/components/ui/avatar";
import { Button } from "src/core/shared/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "src/core/shared/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "src/core/shared/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "src/core/shared/components/ui/tooltip";
import { cn } from "src/core/shared/utils";

type Item = {
  label: string;
  icon: LucideIcon;
  badge?: { value: string; tone?: "accent" | "warning" | "neutral" };
  dot?: boolean;
  active?: boolean;
  href?: string;
  onSelect?: () => void;
  match?: (pathname: string) => boolean;
  permission?: AppPermissionKey;
};

type Group = {
  label?: string;
  items: Item[];
};

const defaultGroups: Group[] = [
  {
    items: [{ label: "Dashboard", icon: Home, href: "/dashboard" }],
  },
  {
    label: "Inteligência operacional",
    items: [
      { label: "Brain", icon: Brain, href: "/onboarding" },
      { label: "Agentes", icon: Shield },
      { label: "Créditos", icon: Coins },
      { label: "Fontes do brain", icon: Library },
    ],
  },
  {
    label: "Execução",
    items: [
      { label: "Histórico de execuções", icon: Sparkles },
      { label: "Templates de briefing", icon: Image },
      { label: "Demandas", icon: FileText },
      { label: "Relatórios", icon: Megaphone },
    ],
  },
  {
    label: "Automações",
    items: [
      { label: "Workflows", icon: Zap },
      { label: "Execuções", icon: Workflow },
      { label: "Agenda operacional", icon: Bell },
      { label: "Alertas", icon: Bell },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Equipe", icon: Users },
      { label: "Permissões", icon: KeyRound },
      { label: "Integrações", icon: PlugZap },
      { label: "Brain assets", icon: FolderOpen },
      { label: "Configurações", icon: Settings },
    ],
  },
];

type WorkspaceInfo = { name: string; meta: string; initials: string };
type UserInfo = { name: string; email: string; role: string; initials: string };

type AppSidebarProps = {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showToggle?: boolean;
  workspace?: WorkspaceInfo;
  user?: UserInfo;
  groups?: Group[];
  className?: string;
  fullHeight?: boolean;
  workspaceTrigger?:
    | React.ReactNode
    | ((collapsed: boolean) => React.ReactNode);
  userTrigger?: React.ReactNode | ((collapsed: boolean) => React.ReactNode);
};

function AppSidebar({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  showToggle = false,
  workspace = {
    name: "Acme Operations",
    meta: "Enterprise · 14 seats",
    initials: "AO",
  },
  user = {
    name: "Ana Silva",
    email: "ana@acme.com",
    role: "Owner",
    initials: "AS",
  },
  groups = defaultGroups,
  className,
  fullHeight = false,
  workspaceTrigger,
  userTrigger,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { can: canDo, isLoading: abilityLoading } = useAbility();
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = openProp ?? internalOpen;
  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange?.(nextOpen);
      if (openProp === undefined) setInternalOpen(nextOpen);
    },
    [onOpenChange, openProp],
  );
  const collapsed = !open;

  function canShowItem(item: Item): boolean {
    if (!item.permission) return true;
    if (abilityLoading) return false;
    const mapping = permissionMap[item.permission];
    if (!mapping) return false;
    return canDo(mapping[0], mapping[1]);
  }

  const filteredGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter(canShowItem),
    }))
    .filter((g) => !g.label || g.items.length > 0);

  const labeledGroups = filteredGroups.filter((g) => g.label);

  const isItemActive = React.useCallback(
    (item: Item, path: string): boolean => {
      if (item.match) return item.match(path);
      if (item.href) return path === item.href;
      return false;
    },
    [],
  );

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        labeledGroups.flatMap((group) => {
          if (!group.label) return [];

          return [
            [
              group.label,
              group.items.some((item) => isItemActive(item, pathname)),
            ],
          ];
        }),
      ),
  );

  React.useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const group of groups) {
        if (!group.label) continue;
        if (group.items.some((item) => isItemActive(item, pathname))) {
          next[group.label] = true;
        }
      }
      return next;
    });
  }, [groups, isItemActive, pathname]);

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  const workspaceNode =
    typeof workspaceTrigger === "function"
      ? workspaceTrigger(collapsed)
      : workspaceTrigger;
  const userNode =
    typeof userTrigger === "function" ? userTrigger(collapsed) : userTrigger;

  return (
    <SidebarProvider
      defaultOpen
      open
      onOpenChange={setOpen}
      className={cn(
        "w-auto",
        fullHeight ? "h-svh min-h-0" : "!min-h-0",
        className,
      )}
    >
      <Sidebar
        collapsible="none"
        variant="sidebar"
        className={cn(
          "h-full rounded-[var(--r-xl)] border border-[var(--line-default)] bg-[var(--bg-base)] shadow-[var(--shadow-sm)] transition-[width] duration-[var(--dur-base)] ease-[var(--ease-out)]",
          collapsed ? "w-[68px]" : "w-[268px]",
        )}
        style={
          {
            "--sidebar-width": collapsed ? "68px" : "268px",
          } as React.CSSProperties
        }
      >
        <SidebarHeader className="gap-2.5 border-b border-[var(--line-subtle)] p-3">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              {workspaceNode ?? (
                <Avatar shape="square" className="size-10">
                  <AvatarFallback className="text-[13px]">
                    {workspace.initials}
                  </AvatarFallback>
                </Avatar>
              )}
              {showToggle ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Expand sidebar"
                  onClick={() => setOpen(true)}
                >
                  <PanelLeftOpen className="size-4" />
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                {workspaceNode ?? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-2.5 text-left transition-colors duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)]"
                  >
                    <Avatar shape="square" className="size-10">
                      <AvatarFallback className="text-[13px]">
                        {workspace.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                        {workspace.name}
                      </p>
                      <p className="truncate text-[11.5px] text-[var(--fg-tertiary)]">
                        {workspace.meta}
                      </p>
                    </div>
                    <ChevronsUpDown className="size-3.5 shrink-0 text-[var(--fg-quaternary)]" />
                  </button>
                )}
              </div>
              {showToggle ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Collapse sidebar"
                  onClick={() => setOpen(false)}
                >
                  <PanelLeftClose className="size-4" />
                </Button>
              ) : null}
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className="gap-1 px-2 py-2">
          {filteredGroups.map((group, groupIndex) => {
            const label = group.label;
            const isLabeledGroup = Boolean(label);
            const isGroupOpen = label ? (openGroups[label] ?? false) : true;

            return (
              <Collapsible
                key={label ?? `group-${groupIndex}`}
                open={collapsed || !isLabeledGroup || isGroupOpen}
                onOpenChange={label ? () => toggleGroup(label) : undefined}
              >
                <SidebarGroup className="gap-0 p-0">
                  {!collapsed && isLabeledGroup ? (
                    <CollapsibleTrigger asChild>
                      <SidebarGroupLabel className="flex cursor-pointer items-center justify-between px-2.5 py-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--fg-quaternary)] transition-colors hover:text-[var(--fg-secondary)]">
                        {label}
                        <ChevronRight
                          className={cn(
                            "size-3 shrink-0 transition-transform duration-[var(--dur-base)]",
                            isGroupOpen && "rotate-90",
                          )}
                        />
                      </SidebarGroupLabel>
                    </CollapsibleTrigger>
                  ) : null}
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <SidebarGroupContent>
                      <SidebarMenu
                        className={cn(
                          "gap-0.5",
                          isLabeledGroup &&
                            !collapsed &&
                            "ml-2 border-l border-[var(--line-subtle)] pl-2",
                        )}
                      >
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = item.match
                            ? item.match(pathname)
                            : item.href
                              ? pathname === item.href
                              : item.active;
                          const content = (
                            <>
                              <span className="relative inline-flex">
                                <Icon className="size-4 shrink-0" />
                                {item.dot ? (
                                  <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[var(--accent)]" />
                                ) : null}
                              </span>
                              {!collapsed ? (
                                <span className="flex-1 truncate text-left">
                                  {item.label}
                                </span>
                              ) : null}
                            </>
                          );
                          const button = (
                            <SidebarMenuButton
                              asChild={Boolean(item.href)}
                              isActive={isActive}
                              onClick={item.onSelect}
                              className={cn(
                                "h-9 gap-2.5 rounded-[var(--r-md)] text-[13px] text-[var(--fg-secondary)] transition-colors duration-[var(--dur-fast)]",
                                "hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]",
                                "data-[active=true]:bg-[var(--bg-hover)] data-[active=true]:text-[var(--fg-primary)]",
                                collapsed && "justify-center px-0",
                              )}
                            >
                              {item.href ? (
                                <Link href={item.href}>{content}</Link>
                              ) : (
                                content
                              )}
                            </SidebarMenuButton>
                          );
                          return (
                            <SidebarMenuItem
                              key={item.label}
                              className="relative"
                            >
                              {isActive ? (
                                <span
                                  aria-hidden
                                  className="pointer-events-none absolute left-0 top-1/2 z-10 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent)]"
                                />
                              ) : null}
                              {collapsed ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    {button}
                                  </TooltipTrigger>
                                  <TooltipContent side="right">
                                    {item.label}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                button
                              )}
                              {!collapsed && item.badge ? (
                                <SidebarMenuBadge
                                  className={cn(
                                    "rounded-[var(--r-sm)] px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums",
                                    item.badge.tone === "accent"
                                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                                      : item.badge.tone === "warning"
                                        ? "bg-[color-mix(in_oklch,var(--warning)_18%,transparent)] text-[var(--warning)]"
                                        : "bg-[var(--bg-sunken)] text-[var(--fg-tertiary)]",
                                  )}
                                >
                                  {item.badge.value}
                                </SidebarMenuBadge>
                              ) : null}
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            );
          })}
        </SidebarContent>

        <SidebarFooter className="border-t border-[var(--line-subtle)] p-2">
          {collapsed ? (
            <div className="flex justify-center">
              {userNode ?? (
                <Avatar className="size-9 ring-2 ring-[var(--accent-soft-hi)]">
                  <AvatarFallback className="text-[11px]">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ) : userNode ? (
            userNode
          ) : (
            <div className="flex items-center gap-2.5 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-2">
              <Avatar className="size-9">
                <AvatarFallback className="text-[11px]">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                  {user.name}
                </p>
                <p className="truncate text-[11.5px] text-[var(--fg-tertiary)]">
                  {user.role} · {user.email}
                </p>
              </div>
              <button
                type="button"
                aria-label="Settings"
                className="flex size-7 shrink-0 items-center justify-center rounded-[var(--r-sm)] text-[var(--fg-quaternary)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]"
              >
                <Settings className="size-3.5" />
              </button>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
}

export {
  AppSidebar,
  defaultGroups,
  type Group as SidebarGroupDef,
  type Item as SidebarItemDef,
};
