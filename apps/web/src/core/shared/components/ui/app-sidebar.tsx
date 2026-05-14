"use client";

import {
  Bell,
  Brain,
  CheckCheck,
  ChevronsUpDown,
  FileText,
  Home,
  LayoutTemplate,
  type LucideIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  Volume2,
  Workflow,
  Zap,
} from "lucide-react";
import * as React from "react";
import { Avatar, AvatarFallback } from "src/core/shared/components/ui/avatar";
import { Button } from "src/core/shared/components/ui/button";
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
};

type Group = {
  label?: string;
  items: Item[];
};

const defaultGroups: Group[] = [
  {
    items: [
      { label: "Overview", icon: Home, active: true },
      {
        label: "Company brain",
        icon: Brain,
        badge: { value: "42", tone: "accent" },
      },
      { label: "Skills", icon: Shield },
      { label: "Automations", icon: Zap, dot: true },
      { label: "Workflows", icon: Workflow },
    ],
  },
  {
    label: "Studio",
    items: [
      { label: "Landing pages", icon: FileText },
      {
        label: "Social",
        icon: Volume2,
        badge: { value: "12 drafts", tone: "neutral" },
      },
      { label: "Reports", icon: LayoutTemplate },
    ],
  },
  {
    label: "Queue",
    items: [
      {
        label: "Approvals",
        icon: CheckCheck,
        badge: { value: "7", tone: "warning" },
      },
      { label: "Activity", icon: Bell },
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

        <SidebarContent className="gap-2 px-2 py-2">
          {groups.map((group, groupIndex) => (
            <SidebarGroup
              key={group.label ?? `group-${groupIndex}`}
              className="gap-1 p-0"
            >
              {!collapsed && group.label ? (
                <SidebarGroupLabel className="px-2.5 pt-2 text-[10.5px] font-medium tracking-[0.14em] text-[var(--fg-quaternary)] uppercase">
                  {group.label}
                </SidebarGroupLabel>
              ) : null}
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const button = (
                      <SidebarMenuButton
                        isActive={item.active}
                        onClick={item.onSelect}
                        className={cn(
                          "h-9 gap-2.5 rounded-[var(--r-md)] text-[13px] text-[var(--fg-secondary)] transition-colors duration-[var(--dur-fast)]",
                          "hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]",
                          "data-[active=true]:bg-[var(--bg-hover)] data-[active=true]:text-[var(--fg-primary)]",
                          collapsed && "justify-center px-0",
                        )}
                      >
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
                      </SidebarMenuButton>
                    );
                    return (
                      <SidebarMenuItem key={item.label} className="relative">
                        {item.active ? (
                          <span
                            aria-hidden
                            className="pointer-events-none absolute left-0 top-1/2 z-10 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent)]"
                          />
                        ) : null}
                        {collapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{button}</TooltipTrigger>
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
            </SidebarGroup>
          ))}
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
