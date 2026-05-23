"use client";

import type { AppPermissionKey } from "@company-os/authz";
import { permissionMap } from "@company-os/authz";
import {
  ArrowLeftRight,
  Bot,
  Brain,
  ChevronRight,
  ChevronsUpDown,
  Coins,
  FileCode2,
  History,
  Home,
  Image,
  KeyRound,
  Library,
  type LucideIcon,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  PlugZap,
  Settings,
  Share2,
  Shield,
  Users,
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
  id?: string;
  label: React.ReactNode;
  icon: LucideIcon;
  action?: React.ReactNode;
  badge?: { value: string; tone?: "accent" | "warning" | "neutral" };
  beta?: boolean;
  soon?: boolean;
  dot?: boolean;
  active?: boolean;
  href?: string;
  onSelect?: () => void;
  match?: (pathname: string) => boolean;
  permission?: AppPermissionKey;
};

type Group = {
  label?: string;
  /** Quando false, o label é estático (sem chevron, sem colapsar). Default: true quando há label. */
  collapsible?: boolean;
  items: Item[];
  emptyState?: React.ReactNode;
};

const SIDEBAR_OPEN_KEY = "workana-ai:sidebar-open";
const SIDEBAR_GROUPS_KEY = "workana-ai:sidebar-groups-state";

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const defaultGroups: Group[] = [
  {
    items: [{ label: "Dashboard", icon: Home, href: "/dashboard" }],
  },
  {
    label: "Agentes",
    collapsible: false,
    items: [
      { label: "Meus agentes", icon: Bot },
      { label: "Gerar copy", icon: PenLine },
      { label: "Gerar imagem", icon: Image },
      { label: "Criar post", icon: Share2 },
      { label: "Adaptar conteúdo", icon: ArrowLeftRight },
      { label: "Criar email", icon: Mail },
      { label: "Histórico", icon: History },
      { label: "Créditos", icon: Coins },
    ],
  },
  {
    label: "Empresa",
    collapsible: false,
    items: [
      { label: "Brain", icon: Brain, href: "/onboarding" },
      { label: "Contexto", icon: Library, href: "/dashboard/workspace/context", permission: "context.read" },
      {
        label: "Design System",
        icon: FileCode2,
        href: "/dashboard/workspace/design-system",
        permission: "design-system.read",
      },
      { label: "Integrações", icon: PlugZap, href: "/dashboard/workspace/integrations" },
    ],
  },
  {
    label: "Workspace",
    collapsible: false,
    items: [
      { label: "Equipe", icon: Users, href: "/dashboard/workspace/team" },
      { label: "Permissões", icon: KeyRound, href: "/dashboard/workspace/permissions" },
      { label: "Configurações", icon: Settings, href: "/dashboard/workspace/settings" },
      { label: "Admin", icon: Shield },
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
    .filter((g) => !g.label || g.items.length > 0 || Boolean(g.emptyState));

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
    () => readStorage<Record<string, boolean>>(SIDEBAR_GROUPS_KEY, {}),
  );

  React.useEffect(() => {
    const activeCollapsibleLabels = filteredGroups
      .filter((group) => group.label && group.collapsible !== false)
      .filter((group) =>
        group.items.some((item) => isItemActive(item, pathname)),
      )
      .map((group) => group.label as string);

    if (activeCollapsibleLabels.length === 0) {
      return;
    }

    setOpenGroups((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const label of activeCollapsibleLabels) {
        if (next[label] === false) {
          next[label] = true;
          changed = true;
        }
      }

      if (!changed) {
        return prev;
      }

      writeStorage(SIDEBAR_GROUPS_KEY, next);
      return next;
    });
  }, [filteredGroups, isItemActive, pathname]);

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      writeStorage(SIDEBAR_GROUPS_KEY, next);
      return next;
    });
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
        <SidebarHeader className="h-[82px] gap-2.5 border-b border-[var(--line-subtle)] p-3">
          {collapsed ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
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
            <div className="flex h-full items-center gap-2">
              <div className="min-w-0 flex-1 h-full">
                {workspaceNode ?? (
                  <button
                    type="button"
                    className="flex h-full w-full items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-2.5 text-left transition-colors duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)]"
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
            const isCollapsible = group.collapsible !== false && isLabeledGroup;
            const isGroupOpen = isCollapsible ? (label ? (openGroups[label] ?? true) : true) : true;

            return (
              <Collapsible
                key={label ?? `group-${groupIndex}`}
                open={collapsed || !isLabeledGroup || isGroupOpen}
                onOpenChange={isCollapsible && label ? () => toggleGroup(label) : undefined}
              >
                <SidebarGroup className="gap-0 p-0">
                  {!collapsed && isLabeledGroup ? (
                    isCollapsible ? (
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
                    ) : (
                      <SidebarGroupLabel className="px-2.5 py-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--fg-quaternary)]">
                        {label}
                      </SidebarGroupLabel>
                    )
                  ) : null}
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <SidebarGroupContent>
                      {group.items.length === 0 && group.emptyState && !collapsed ? (
                        <div
                          className={cn(
                            "ml-2 rounded-[var(--r-md)] border border-dashed border-[var(--line-default)] bg-[var(--bg-sunken)] px-3 py-3 text-[12px] text-[var(--fg-tertiary)]",
                            isLabeledGroup && "ml-2",
                          )}
                        >
                          {group.emptyState}
                        </div>
                      ) : (
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
                            const isActive =
                              typeof item.active === "boolean"
                                ? item.active
                                : item.match
                                  ? item.match(pathname)
                                  : item.href
                                    ? pathname === item.href
                                    : false;
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
                                asChild={Boolean(item.href) && !item.soon}
                                isActive={isActive}
                                disabled={item.soon}
                                onClick={!item.soon ? item.onSelect : undefined}
                                className={cn(
                                  "h-9 gap-2.5 rounded-[var(--r-md)] text-[13px] text-[var(--fg-secondary)] transition-colors duration-[var(--dur-fast)]",
                                  "hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]",
                                  "data-[active=true]:bg-[var(--bg-hover)] data-[active=true]:text-[var(--fg-primary)]",
                                  item.soon &&
                                    "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-[var(--fg-secondary)]",
                                  collapsed && "justify-center px-0",
                                )}
                              >
                                {item.href && !item.soon ? (
                                  <Link href={item.href}>{content}</Link>
                                ) : (
                                  content
                                )}
                              </SidebarMenuButton>
                            );
                            return (
                              <SidebarMenuItem
                                key={item.id ?? item.href ?? (typeof item.label === "string" ? item.label : item.id)}
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
                                      {item.soon ? " · Em breve" : ""}
                                    </TooltipContent>
                                  </Tooltip>
                                ) : item.action ? (
                                  <div className="flex w-full min-w-0 items-center pr-2">
                                    <div className="min-w-0 flex-1 overflow-hidden">{button}</div>
                                    <div className="shrink-0 pl-1">{item.action}</div>
                                  </div>
                                ) : (
                                  button
                                )}
                                {!collapsed && (item.badge || item.soon) ? (
                                  <SidebarMenuBadge className="pointer-events-none">
                                    {item.soon ? (
                                      <span className="rounded-[var(--r-sm)] bg-[var(--bg-sunken)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--fg-quaternary)]">
                                        Em breve
                                      </span>
                                    ) : item.badge ? (
                                      <span
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
                                      </span>
                                    ) : null}
                                  </SidebarMenuBadge>
                                ) : null}
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      )}
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
