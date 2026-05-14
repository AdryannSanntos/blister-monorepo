"use client";

import {
  ArrowUpRight,
  Bell,
  Brain,
  Check,
  CheckCheck,
  ChevronsUpDown,
  CircleHelp,
  Eye,
  FileText,
  LogOut,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  TrendingUp,
  TriangleAlert,
  Users,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip as ReTooltip,
  XAxis,
} from "recharts";
import { toast } from "sonner";

import { AppSidebar } from "@/core/shared/components/ui/app-sidebar";
import { Avatar, AvatarFallback } from "@/core/shared/components/ui/avatar";
import { Badge } from "@/core/shared/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/core/shared/components/ui/breadcrumb";
import { Button } from "@/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/core/shared/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
} from "@/core/shared/components/ui/chart";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/core/shared/components/ui/command";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/core/shared/components/ui/dialog";
import { Display } from "@/core/shared/components/ui/display";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/core/shared/components/ui/dropdown-menu";
import { Kbd } from "@/core/shared/components/ui/kbd";
import { Paragraph } from "@/core/shared/components/ui/paragraph";
import { Progress } from "@/core/shared/components/ui/progress";
import { Textarea } from "@/core/shared/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/core/shared/components/ui/tooltip";
import { cn } from "@/core/shared/utils";

type Workspace = {
  id: string;
  name: string;
  meta: string;
  initials: string;
  plan: "Enterprise" | "Trial" | "Free";
};

const workspaces: Workspace[] = [
  {
    id: "acme",
    name: "Acme Operations",
    meta: "Enterprise · 14 seats",
    initials: "AO",
    plan: "Enterprise",
  },
  {
    id: "speed",
    name: "Speed Milhas",
    meta: "Travel · Reward management",
    initials: "SM",
    plan: "Enterprise",
  },
  {
    id: "north",
    name: "North Studio",
    meta: "Trial · 4d left",
    initials: "NS",
    plan: "Trial",
  },
];

type ApprovalItem = {
  id: string;
  title: string;
  meta: string;
  confidence: number;
  tone: "accent" | "warning";
};

const initialApprovals: ApprovalItem[] = [
  {
    id: "linkedin-q4",
    title: "LinkedIn carousel · Q4 launch",
    meta: "Aurora · 14:02",
    confidence: 94,
    tone: "accent",
  },
  {
    id: "email-acme",
    title: "Email · sales follow-up · Acme",
    meta: "Aurora · 13:48",
    confidence: 88,
    tone: "accent",
  },
  {
    id: "pricing-v2",
    title: "Landing page · pricing v2",
    meta: "Aurora · 13:30",
    confidence: 79,
    tone: "warning",
  },
];

const activity = [
  {
    tone: "success" as const,
    icon: Check,
    title: "Q4 Lead Nurture — 12 new runs completed",
    meta: "2 minutes ago",
  },
  {
    tone: "accent" as const,
    icon: Sparkles,
    title: "Aurora pre-drafted next week's social calendar",
    meta: "14 minutes ago · awaiting your review",
  },
  {
    tone: "warning" as const,
    icon: TriangleAlert,
    title: "Token budget approaching 80%",
    meta: "32 minutes ago",
  },
  {
    tone: "info" as const,
    icon: Users,
    title: "Luis Mota joined Acme Operations",
    meta: "1 hour ago",
  },
  {
    tone: "info" as const,
    icon: Zap,
    title: "Stripe sync resumed after auth refresh",
    meta: "3 hours ago",
  },
];

const skillExecutions = [
  { month: "Jan", runs: 92 },
  { month: "Feb", runs: 78 },
  { month: "Mar", runs: 134 },
  { month: "Apr", runs: 88 },
  { month: "May", runs: 168 },
  { month: "Jun", runs: 96 },
  { month: "Jul", runs: 184 },
  { month: "Aug", runs: 154 },
  { month: "Sep", runs: 198 },
  { month: "Oct", runs: 176 },
  { month: "Nov", runs: 132, forecast: true },
  { month: "Dec", runs: 156, forecast: true },
];

const chartConfig: ChartConfig = {
  runs: { label: "Runs", color: "var(--accent)" },
};

function WorkspaceSwitcher({
  active,
  onChange,
  compact = false,
}: {
  active: Workspace;
  onChange: (ws: Workspace) => void;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={
            compact ? `Switch workspace, current: ${active.name}` : undefined
          }
          className={cn(
            "flex items-center rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] text-left transition-colors duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)]",
            compact ? "size-10 justify-center p-0" : "w-full gap-3 p-2.5",
          )}
        >
          <Avatar shape="square" className={compact ? "size-8" : "size-10"}>
            <AvatarFallback className={compact ? "text-[12px]" : "text-[13px]"}>
              {active.initials}
            </AvatarFallback>
          </Avatar>
          {compact ? null : (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                  {active.name}
                </p>
                <p className="truncate text-[11.5px] text-[var(--fg-tertiary)]">
                  {active.meta}
                </p>
              </div>
              <ChevronsUpDown className="size-3.5 shrink-0 text-[var(--fg-quaternary)]" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-[10.5px] tracking-[0.14em] text-[var(--fg-quaternary)] uppercase">
          Workspaces
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => {
                onChange(ws);
                toast.success(`Switched to ${ws.name}`);
              }}
              className="gap-3 py-2.5"
            >
              <Avatar shape="square" className="size-9">
                <AvatarFallback className="text-[12px]">
                  {ws.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                  {ws.name}
                </p>
                <p className="truncate text-[11.5px] text-[var(--fg-tertiary)]">
                  {ws.meta}
                </p>
              </div>
              {active.id === ws.id ? (
                <Check className="size-4 text-[var(--accent)]" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => toast.info("Workspace creation coming soon")}
        >
          <Plus />
          Create workspace
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings />
          Workspace settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={compact ? "Open user menu" : undefined}
          className={cn(
            "flex items-center rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] text-left transition-colors duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)]",
            compact ? "size-10 justify-center p-0" : "w-full gap-2.5 p-2",
          )}
        >
          <Avatar className={compact ? "size-8" : "size-9"}>
            <AvatarFallback className="text-[11px]">AS</AvatarFallback>
          </Avatar>
          {compact ? null : (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                  Ana Silva
                </p>
                <p className="truncate text-[11.5px] text-[var(--fg-tertiary)]">
                  Owner · ana@acme.com
                </p>
              </div>
              <ChevronsUpDown className="size-3.5 shrink-0 text-[var(--fg-quaternary)]" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-64">
        <div className="flex items-center gap-3 p-2">
          <Avatar className="size-10">
            <AvatarFallback className="text-[12px]">AS</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
              Ana Silva
            </p>
            <p className="truncate text-[11.5px] text-[var(--fg-tertiary)]">
              ana@acme.com
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Users />
          Invite teammates
          <Badge variant="default" className="ml-auto px-1.5 py-0 text-[10px]">
            Free
          </Badge>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Moon /> : <Sun />}
          Theme
          <span className="ml-auto text-[11.5px] text-[var(--fg-tertiary)] capitalize">
            {theme}
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => toast("Signed out")}>
          <LogOut />
          Sign out
          <DropdownMenuShortcut>⇧Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MetricCard({
  label,
  value,
  unit,
  delta,
  deltaTone,
  hint,
  children,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaTone?: "success" | "warning" | "tertiary";
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card data-interactive className="min-h-[138px]">
      <CardContent className="flex flex-col gap-1.5 pb-4">
        <div className="flex flex-col gap-1.5">
          <Paragraph
            size="p6"
            tone="quaternary"
            className="uppercase tracking-[0.12em]"
          >
            {label}
          </Paragraph>
          <p className="text-[34px] leading-none font-medium tabular-nums tracking-[-0.025em] text-[var(--fg-primary)]">
            {value}
            {unit ? (
              <span className="ml-1 text-[16px] text-[var(--fg-tertiary)]">
                {unit}
              </span>
            ) : null}
          </p>
        </div>
      </CardContent>
      {(delta || hint || children) && (
        <CardFooter className="min-h-0 flex-col items-start gap-2 pt-0">
          {delta ? (
            <p
              className={cn(
                "text-[12.5px] leading-none font-medium",
                deltaTone === "success"
                  ? "text-[var(--success)]"
                  : "text-[var(--fg-tertiary)]",
              )}
            >
              {delta}
            </p>
          ) : null}
          {hint ? (
            <Paragraph size="p6" tone="quaternary">
              {hint}
            </Paragraph>
          ) : null}
          {children}
        </CardFooter>
      )}
    </Card>
  );
}

export function DashboardPage() {
  const [activeWorkspace, setActiveWorkspace] = React.useState<Workspace>(
    workspaces[0],
  );
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [runAuroraOpen, setRunAuroraOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [approvals, setApprovals] =
    React.useState<ApprovalItem[]>(initialApprovals);
  const [auroraPrompt, setAuroraPrompt] = React.useState("");
  const [draftProgress, setDraftProgress] = React.useState(70);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setDraftProgress((p) => (p >= 96 ? 70 : p + 1));
    }, 600);
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const approve = (id: string) => {
    const item = approvals.find((a) => a.id === id);
    setApprovals((list) => list.filter((a) => a.id !== id));
    if (item) toast.success("Approved", { description: item.title });
  };
  const revise = (id: string) => {
    const item = approvals.find((a) => a.id === id);
    if (item) toast("Revision requested", { description: item.title });
  };

  const submitAurora = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auroraPrompt.trim()) return;
    toast.success("Aurora queued", { description: auroraPrompt.slice(0, 80) });
    setAuroraPrompt("");
    setRunAuroraOpen(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--fg-primary)]">
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search or jump to…" />
        <CommandList>
          <CommandEmpty>No matches found.</CommandEmpty>
          <CommandGroup heading="Suggested actions">
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                setRunAuroraOpen(true);
              }}
            >
              <Sparkles />
              Run Aurora
              <CommandShortcut>R</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                toast.info("Drafting calendar…");
              }}
            >
              <FileText />
              Draft next week&apos;s social calendar
            </CommandItem>
            <CommandItem onSelect={() => setCommandOpen(false)}>
              <WandSparkles />
              Generate landing page
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => setCommandOpen(false)}>
              <Brain />
              Company brain
            </CommandItem>
            <CommandItem onSelect={() => setCommandOpen(false)}>
              <CheckCheck />
              Approvals
            </CommandItem>
            <CommandItem onSelect={() => setCommandOpen(false)}>
              <Settings />
              Settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Dialog open={runAuroraOpen} onOpenChange={setRunAuroraOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={submitAurora} className="grid gap-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-[var(--accent)]" />
                Run Aurora
              </DialogTitle>
              <DialogDescription>
                Describe what you want Aurora to do. It will pick the right
                skill and route results to your approval queue.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                autoFocus
                value={auroraPrompt}
                onChange={(event) => setAuroraPrompt(event.target.value)}
                placeholder="e.g. Draft 5 LinkedIn posts about our Q4 launch — short, punchy, ending with a CTA."
                className="min-h-[120px]"
              />
              <div className="flex items-center justify-between text-[12px] text-[var(--fg-tertiary)]">
                <span>Aurora-Pro · ~$0.03 / 1k tok</span>
                <span>{auroraPrompt.length} / 2000</span>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRunAuroraOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!auroraPrompt.trim()}>
                <Sparkles />
                Run
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex h-svh overflow-hidden">
        <AppSidebar
          defaultOpen
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          fullHeight
          className="shrink-0 p-3"
          workspace={{
            name: activeWorkspace.name,
            meta: activeWorkspace.meta,
            initials: activeWorkspace.initials,
          }}
          workspaceTrigger={(collapsed) => (
            <WorkspaceSwitcher
              active={activeWorkspace}
              onChange={setActiveWorkspace}
              compact={collapsed}
            />
          )}
          userTrigger={(collapsed) => <UserMenu compact={collapsed} />}
        />

        <main className="min-w-0 flex-1 overflow-y-auto px-6 pb-4">
          <header className="sticky top-0 z-30 -mx-6 mb-8 grid min-h-20 items-center gap-4 border-b border-[var(--line-subtle)] bg-[color-mix(in_oklch,var(--bg-canvas)_90%,transparent)] px-8 py-5 backdrop-blur md:grid-cols-[1fr_auto_1fr]">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                size="md"
                className="size-9 p-0"
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                onClick={() => setSidebarOpen((open) => !open)}
              >
                {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
              </Button>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard">
                      {activeWorkspace.name}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Overview</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="hidden h-9 min-w-80 items-center justify-center gap-2 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] px-3 text-[12.5px] text-[var(--fg-tertiary)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)] md:inline-flex"
            >
              <Search className="size-3.5" />
              Search or run…
              <Kbd>⌘K</Kbd>
            </button>

            <div className="flex items-center justify-start gap-2 md:justify-end">
              <div className="flex items-center gap-1.5 px-2 text-[12px] text-[var(--fg-tertiary)]">
                <span className="size-1.5 rounded-full bg-[var(--success)]" />
                Autosaved 14s ago
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="md"
                    className="size-9 p-0"
                    aria-label="Notifications"
                  >
                    <Bell />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Notifications</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="md"
                    className="size-9 p-0"
                    aria-label="Help"
                  >
                    <CircleHelp />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Help & shortcuts</TooltipContent>
              </Tooltip>
              <Button onClick={() => setRunAuroraOpen(true)}>
                <Sparkles />
                Run Aurora
              </Button>
            </div>
          </header>

          <Card className="mb-6 border-[color-mix(in_oklch,var(--accent)_45%,transparent)] bg-[color-mix(in_oklch,var(--accent)_10%,transparent)] shadow-none">
            <CardContent className="flex flex-wrap items-center gap-3 py-3">
              <Sparkles className="size-4 shrink-0 text-[var(--accent)]" />
              <p className="flex-1 text-[13.5px] leading-5 text-[var(--fg-primary)]">
                <strong className="font-medium">Aurora suggests</strong>{" "}
                drafting next week&apos;s social calendar — based on your Q4
                launch timeline, you&apos;ll need 11 posts by Tuesday.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => toast("Dismissed for today")}
                >
                  Not now
                </Button>
                <Button onClick={() => setRunAuroraOpen(true)}>
                  Open in Studio
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <section className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <Display level="d3" asChild>
                <h1 className="text-[40px] leading-[1.05] tracking-[-0.02em] text-[var(--fg-primary)]">
                  Good afternoon, <span className="font-medium">Ana</span>.
                </h1>
              </Display>
              <Paragraph size="p3" tone="tertiary">
                {approvals.length}{" "}
                {approvals.length === 1 ? "thing needs" : "things need"} your
                attention today. Aurora handled 1,284 the rest.
              </Paragraph>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Last 7 days
                    <ChevronsUpDown className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem>Today</DropdownMenuItem>
                  <DropdownMenuItem>
                    Last 7 days{" "}
                    <Check className="ml-auto size-3.5 text-[var(--accent)]" />
                  </DropdownMenuItem>
                  <DropdownMenuItem>Last 30 days</DropdownMenuItem>
                  <DropdownMenuItem>This quarter</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline">
                <ArrowUpRight />
                Share
              </Button>
            </div>
          </section>

          <section className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Runs · 7D"
              value="1,284"
              delta="▲ 12.4% vs prior 7d"
              deltaTone="success"
            />
            <MetricCard
              label="Approvals pending"
              value={String(approvals.length)}
              delta="oldest 14m"
              deltaTone="tertiary"
            />
            <MetricCard label="Budget" value="62" unit="%">
              <div className="pt-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-sunken)]">
                  <div
                    className="h-full rounded-full bg-[var(--danger)]"
                    style={{ width: "62%" }}
                  />
                </div>
              </div>
            </MetricCard>
            <MetricCard
              label="Approval rate"
              value="94"
              unit="%"
              delta="▲ 1.2pp"
              deltaTone="success"
            />
          </section>

          <section className="mb-4 grid gap-3 xl:grid-cols-2">
            <Card className="border-[color-mix(in_oklch,var(--accent)_46%,var(--line-default))]">
              <CardHeader className="min-h-20 content-center border-b border-[var(--line-subtle)] pb-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-2">
                    <Badge variant="secondary" className="w-fit gap-2">
                      <span className="ds-ai-pulse size-2 rounded-full bg-[var(--accent)]" />
                      Aurora drafting
                    </Badge>
                    <div className="flex flex-col gap-1">
                      <CardTitle>Q4 launch landing page</CardTitle>
                      <Paragraph size="p5" tone="tertiary">
                        Building testimonials for the launch narrative
                      </Paragraph>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pb-3">
                <div className="rounded-[var(--r-lg)] border border-[var(--line-subtle)] bg-[var(--bg-base)] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <Paragraph size="p6" tone="quaternary">
                        Current block
                      </Paragraph>
                      <p className="text-[13.5px] font-medium text-[var(--fg-primary)]">
                        Block 5 of 7 · Testimonials section
                      </p>
                    </div>
                    <p className="font-mono text-[12px] tabular-nums text-[var(--fg-tertiary)]">
                      {draftProgress}%
                    </p>
                  </div>
                  <Progress value={draftProgress} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["Context", "Q4 launch"],
                    ["Model", "Aurora-Pro"],
                    ["Cost", "est. $0.32"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-base)] p-3"
                    >
                      <Paragraph size="p6" tone="quaternary">
                        {label}
                      </Paragraph>
                      <p className="mt-1 text-[13px] font-medium text-[var(--fg-primary)]">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="min-h-0 flex-wrap justify-between gap-3 border-t border-[var(--line-subtle)] px-5 py-2">
                <Paragraph size="p6" tone="quaternary">
                  Results route to approval queue when generation finishes.
                </Paragraph>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => toast("Cancelled draft")}
                  >
                    <X />
                    Cancel
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost">Show steps</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          Aurora · Q4 launch landing page
                        </DialogTitle>
                        <DialogDescription>
                          7 generation steps · 5 complete
                        </DialogDescription>
                      </DialogHeader>
                      <div>
                        <ol className="flex flex-col gap-2 text-[13px]">
                          {[
                            "Hero section",
                            "Value proposition",
                            "Feature grid",
                            "Social proof",
                            "Pricing table",
                            "Testimonials",
                            "Final CTA",
                          ].map((step, index) => (
                            <li
                              key={step}
                              className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3"
                            >
                              {index < 5 ? (
                                <span className="flex size-6 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--success)_18%,transparent)] text-[var(--success)]">
                                  <Check className="size-3.5" />
                                </span>
                              ) : index === 5 ? (
                                <span className="ds-ai-pulse flex size-6 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                                  <Sparkles className="size-3.5" />
                                </span>
                              ) : (
                                <span className="flex size-6 items-center justify-center rounded-full border border-[var(--line-default)] bg-[var(--bg-sunken)] text-[11px] text-[var(--fg-quaternary)]">
                                  {index + 1}
                                </span>
                              )}
                              <span
                                className={
                                  index < 6
                                    ? "text-[var(--fg-primary)]"
                                    : "text-[var(--fg-tertiary)]"
                                }
                              >
                                {step}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="ghost">Close</Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="min-h-16 content-center border-b border-[var(--line-subtle)] pb-4">
                <CardTitle>Activity</CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <ul className="space-y-2.5">
                  {activity.map((a) => {
                    const Icon = a.icon;
                    const tone =
                      a.tone === "success"
                        ? "var(--success)"
                        : a.tone === "warning"
                          ? "var(--danger)"
                          : a.tone === "accent"
                            ? "var(--accent)"
                            : "var(--info)";
                    return (
                      <li key={a.title} className="flex items-start gap-2.5">
                        <span
                          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full"
                          style={{
                            background: `color-mix(in oklch, ${tone} 16%, transparent)`,
                            color: tone,
                          }}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] text-[var(--fg-primary)]">
                            {a.title}
                          </p>
                          <p className="text-[11.5px] text-[var(--fg-tertiary)]">
                            {a.meta}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
              <CardFooter className="min-h-0 border-t border-[var(--line-subtle)] px-5 py-2">
                <Button variant="ghost">View all</Button>
              </CardFooter>
            </Card>
          </section>

          <section className="mb-4">
            <Card>
              <CardHeader className="min-h-16 content-center border-b border-[var(--line-subtle)] pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CardTitle>Approval queue</CardTitle>
                    {approvals.length > 0 ? (
                      <Badge variant="secondary">
                        {approvals.length} pending
                      </Badge>
                    ) : (
                      <Badge variant="success">All clear</Badge>
                    )}
                  </div>
                  <Button variant="ghost" disabled={approvals.length === 0}>
                    Open all
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {approvals.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <span className="flex size-12 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--success)_18%,transparent)] text-[var(--success)]">
                      <Check className="size-5" />
                    </span>
                    <p className="text-[17px] font-medium tracking-[-0.01em] text-[var(--fg-primary)]">
                      You&apos;re all caught up
                    </p>
                    <Paragraph size="p4" tone="tertiary" className="max-w-md">
                      No drafts awaiting your review. Aurora will surface new
                      items here as they finish.
                    </Paragraph>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {approvals.map((q) => (
                      <li
                        key={q.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex size-10 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
                            <Sparkles className="size-4" />
                          </span>
                          <div>
                            <p className="text-[13.5px] font-medium text-[var(--fg-primary)]">
                              {q.title}
                            </p>
                            <p className="text-[11.5px] text-[var(--fg-tertiary)]">
                              {q.meta}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end gap-1">
                            <Paragraph
                              size="p6"
                              tone="quaternary"
                              className="uppercase tracking-[0.12em]"
                            >
                              Confidence
                            </Paragraph>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--bg-sunken)]">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${q.confidence}%`,
                                    background:
                                      q.tone === "warning"
                                        ? "var(--danger)"
                                        : "var(--accent)",
                                  }}
                                />
                              </div>
                              <span className="font-mono text-[12px] tabular-nums text-[var(--fg-secondary)]">
                                {q.confidence}
                              </span>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="md"
                                className="size-9 p-0"
                                aria-label={`Actions for ${q.title}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() =>
                                  toast.info(`Previewing ${q.title}`)
                                }
                              >
                                <Eye />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => revise(q.id)}>
                                <X />
                                Revise
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => approve(q.id)}>
                                <Check />
                                Approve
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader className="min-h-20 content-center border-b border-[var(--line-subtle)] pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>Skill executions</CardTitle>
                      <Badge variant="secondary" className="gap-1">
                        <TrendingUp className="size-3" />
                        Forecast
                      </Badge>
                    </div>
                    <Paragraph size="p5" tone="tertiary">
                      12-month rolling · all skills
                    </Paragraph>
                  </div>
                  <div className="flex items-center gap-3 text-[12px] text-[var(--fg-tertiary)]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-sm bg-[var(--accent)]" />
                      Runs
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-sm bg-[color-mix(in_oklch,var(--accent)_30%,transparent)]" />
                      Forecast
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost">
                          This year
                          <ChevronsUpDown className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem>
                          This year{" "}
                          <Check className="ml-auto size-3.5 text-[var(--accent)]" />
                        </DropdownMenuItem>
                        <DropdownMenuItem>Last 12 months</DropdownMenuItem>
                        <DropdownMenuItem>Year to date</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-[var(--r-lg)] border border-[var(--line-subtle)] bg-[var(--bg-base)] p-4">
                  <ChartContainer config={chartConfig} className="h-64 w-full">
                    <BarChart data={skillExecutions} barGap={4}>
                      <CartesianGrid
                        vertical={false}
                        stroke="var(--line-subtle)"
                      />
                      <XAxis
                        dataKey="month"
                        stroke="var(--fg-quaternary)"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                      />
                      <ReTooltip
                        cursor={{ fill: "var(--bg-hover)", radius: 4 }}
                        contentStyle={{
                          background: "var(--bg-overlay)",
                          border: "1px solid var(--line-default)",
                          borderRadius: "var(--r-md)",
                          fontSize: 12,
                          color: "var(--fg-primary)",
                        }}
                      />
                      <Bar dataKey="runs" radius={[4, 4, 0, 0]}>
                        {skillExecutions.map((row, index) => (
                          <Cell
                            key={`cell-${row.month}-${index}`}
                            fill={
                              row.forecast
                                ? "color-mix(in oklch, var(--accent) 30%, transparent)"
                                : "var(--accent)"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
