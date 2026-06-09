"use client";

import type { AppPermissionKey } from "@company-os/authz";
import { permissionMap } from "@company-os/authz";
import {
  ChevronRight,
  ChevronsUpDown,
  type LucideIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Link, usePathname } from "@/i18n/routing";
import { useDashboardNavGroups } from "src/core/modules/dashboard/hooks/use-dashboard-nav-groups";
import { useAbility } from "src/core/shared/hooks/use-ability";
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
  statusTone?: "success" | "warning" | "danger";
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

const SIDEBAR_GROUPS_KEY = "blister:sidebar-groups-state";
const SIDEBAR_WIDTH_EXPANDED = "18rem";
const SIDEBAR_WIDTH_COLLAPSED = "4.25rem";

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

function useDefaultSidebarGroups(): Group[] {
  return useDashboardNavGroups();
}

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
  groups: groupsProp,
  className,
  fullHeight = false,
  workspaceTrigger,
  userTrigger,
}: AppSidebarProps) {
  const t = useTranslations("common");
  const tSidebar = useTranslations("sidebar");
  const tDashboard = useTranslations("dashboard");
  const defaultGroupsFromHook = useDefaultSidebarGroups();
  const groups = groupsProp ?? defaultGroupsFromHook;
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

  function getBadgeDotToneClass(
    tone?: "accent" | "warning" | "neutral",
  ): string {
    if (tone === "accent") return "bg-[var(--accent)]";
    if (tone === "warning") return "bg-[var(--warning)]";
    return "bg-[var(--fg-quaternary)]";
  }

  function getStatusToneClass(tone: "success" | "warning" | "danger"): string {
    if (tone === "success") return "bg-[var(--success-600)]";
    if (tone === "warning") return "bg-[var(--warning-600)]";
    return "bg-[var(--error-500)]";
  }

  function renderBadge(item: Item) {
    if (item.soon) {
      return (
        <span className="rounded-[var(--r-sm)] bg-[var(--bg-sunken)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--fg-quaternary)]">
          {t("soon")}
        </span>
      );
    }

    if (!item.badge) return null;

    return (
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
    );
  }

  return (
    <SidebarProvider
      defaultOpen
      open
      onOpenChange={setOpen}
      className={cn(
        "w-auto overflow-clip rounded-r-xl",
        fullHeight ? "h-svh min-h-0" : "!min-h-0",
        className,
      )}
      style={
        {
          "--sidebar-width": collapsed
            ? SIDEBAR_WIDTH_COLLAPSED
            : SIDEBAR_WIDTH_EXPANDED,
        } as React.CSSProperties
      }
    >
      <Sidebar
        collapsible="none"
        variant="sidebar"
        className="h-full overflow-clip rounded-r-xl border-r border-[var(--line-subtle)] bg-[var(--bg-canvas)] transition-[width] duration-[var(--dur-base)] ease-[var(--ease-out)]"
      >
        <SidebarHeader className="h-20 gap-2.5 p-3">
          {collapsed ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              {workspaceNode ?? (
                <Avatar className="size-10">
                  <AvatarFallback className="text-[13px]">
                    {workspace.initials}
                  </AvatarFallback>
                </Avatar>
              )}
              {showToggle ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={tDashboard("expandSidebar")}
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
                    <Avatar className="size-10">
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
                  aria-label={tDashboard("collapseSidebar")}
                  onClick={() => setOpen(false)}
                >
                  <PanelLeftClose className="size-4" />
                </Button>
              ) : null}
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className="gap-1 overflow-x-clip px-2 py-2">
          {filteredGroups.map((group, groupIndex) => {
            const label = group.label;
            const isLabeledGroup = Boolean(label);
            const isCollapsible = group.collapsible !== false && isLabeledGroup;
            const isGroupOpen = isCollapsible
              ? label
                ? (openGroups[label] ?? true)
                : true
              : true;

            return (
              <Collapsible
                key={label ?? `group-${groupIndex}`}
                open={collapsed || !isLabeledGroup || isGroupOpen}
                onOpenChange={
                  isCollapsible && label ? () => toggleGroup(label) : undefined
                }
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
                      <SidebarGroupLabel className="truncate px-2.5 py-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--fg-quaternary)]">
                        {label}
                      </SidebarGroupLabel>
                    )
                  ) : null}
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <SidebarGroupContent>
                      {group.items.length === 0 &&
                      group.emptyState &&
                      !collapsed ? (
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
                            isLabeledGroup && !collapsed && "pl-3",
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
                                  {item.statusTone ? (
                                    collapsed ? (
                                      <span
                                        className={cn(
                                          "ds-ai-pulse absolute -right-0.5 -top-0.5 size-2 rounded-full ring-2 ring-[var(--bg-canvas)]",
                                          getStatusToneClass(item.statusTone),
                                        )}
                                        aria-hidden
                                      />
                                    ) : null
                                  ) : item.dot ? (
                                    <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[var(--accent)]" />
                                  ) : null}
                                  {collapsed && item.badge ? (
                                    <span
                                      className={cn(
                                        "absolute -right-1 -top-1 size-2 rounded-full ring-2 ring-[var(--bg-base)]",
                                        getBadgeDotToneClass(item.badge.tone),
                                      )}
                                    />
                                  ) : null}
                                </span>
                                {!collapsed ? (
                                  <span
                                    className={cn(
                                      "flex-1 truncate text-left",
                                      (item.badge || item.soon) && "pr-6",
                                      item.action && "pr-7",
                                      item.statusTone && !item.badge && !item.soon && "pr-2",
                                    )}
                                  >
                                    {item.label}
                                  </span>
                                ) : null}
                                {!collapsed && item.statusTone ? (
                                  <span
                                    className={cn(
                                      "ds-ai-pulse size-2 shrink-0 rounded-full",
                                      getStatusToneClass(item.statusTone),
                                    )}
                                    aria-hidden
                                  />
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
                                  "h-9 gap-2.5 rounded-[var(--r-md)] text-[13px] font-medium text-[var(--fg-secondary)] transition-colors duration-[var(--dur-fast)]",
                                  "hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]",
                                  "data-[active=true]:bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] data-[active=true]:font-medium data-[active=true]:text-[var(--primary)]",
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
                                key={
                                  item.id ??
                                  item.href ??
                                  (typeof item.label === "string"
                                    ? item.label
                                    : item.id)
                                }
                                className="relative"
                              >
                                {collapsed ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      {button}
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                      {item.label}
                                      {item.soon ? t("soonTooltip") : ""}
                                    </TooltipContent>
                                  </Tooltip>
                                ) : item.action ? (
                                  <div className="flex w-full min-w-0 items-center pr-2">
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                      {button}
                                    </div>
                                    {!collapsed && (item.badge || item.soon) ? (
                                      <div className="shrink-0 pl-1.5">
                                        {renderBadge(item)}
                                      </div>
                                    ) : null}
                                    <div className="shrink-0 pl-1">
                                      {item.action}
                                    </div>
                                  </div>
                                ) : (
                                  button
                                )}
                                {!collapsed &&
                                !item.action &&
                                (item.badge || item.soon) ? (
                                  <SidebarMenuBadge className="pointer-events-none">
                                    {renderBadge(item)}
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
                aria-label={tSidebar("settingsAria")}
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
  useDefaultSidebarGroups,
  type Group as SidebarGroupDef,
  type Item as SidebarItemDef,
};
