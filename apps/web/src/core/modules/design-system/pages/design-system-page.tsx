"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Brain,
  Check,
  ChevronRight,
  Clock3,
  Command,
  Ellipsis,
  Eye,
  FileText,
  Filter,
  FolderOpen,
  Home,
  Info,
  LayoutTemplate,
  Loader2,
  Moon,
  Play,
  Search,
  Settings,
  Sparkles,
  Sun,
  TableProperties,
  Trash2,
  TriangleAlert,
  Users,
  Volume2,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { toast } from "sonner";
import { z } from "zod";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/core/shared/components/ui/accordion";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/core/shared/components/ui/alert";
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
import { Calendar } from "@/core/shared/components/ui/calendar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/core/shared/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/core/shared/components/ui/chart";
import { Checkbox } from "@/core/shared/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/core/shared/components/ui/collapsible";
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
  type ColumnDef,
  DataTable,
} from "@/core/shared/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/core/shared/components/ui/dialog";
import { Display } from "@/core/shared/components/ui/display";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/core/shared/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/core/shared/components/ui/dropdown-menu";
import { DsField } from "@/core/shared/components/ui/ds-field";
import { DsSection } from "@/core/shared/components/ui/ds-section";
import { DsStage } from "@/core/shared/components/ui/ds-stage";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/core/shared/components/ui/form";
import { Heading } from "@/core/shared/components/ui/heading";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/core/shared/components/ui/hover-card";
import { Input } from "@/core/shared/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/core/shared/components/ui/input-otp";
import { Kbd } from "@/core/shared/components/ui/kbd";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/core/shared/components/ui/pagination";
import { Paragraph } from "@/core/shared/components/ui/paragraph";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/core/shared/components/ui/popover";
import { Progress } from "@/core/shared/components/ui/progress";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/core/shared/components/ui/radio-group";
import { ScrollArea } from "@/core/shared/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/core/shared/components/ui/select";
import { Separator } from "@/core/shared/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/core/shared/components/ui/sidebar";
import { Skeleton } from "@/core/shared/components/ui/skeleton";
import { Slider } from "@/core/shared/components/ui/slider";
import { Switch } from "@/core/shared/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/core/shared/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/core/shared/components/ui/tabs";
import { Textarea } from "@/core/shared/components/ui/textarea";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/core/shared/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/core/shared/components/ui/tooltip";
import { cn } from "@/core/shared/utils";

const toc = [
  ["brand", "01 Brand"],
  ["color", "02 Color"],
  ["type", "03 Typography"],
  ["space", "04 Spacing"],
  ["radius", "05 Radius"],
  ["elevation", "06 Elevation"],
  ["borders", "07 Borders"],
  ["icons", "08 Icons"],
  ["motion", "09 Motion"],
  ["buttons", "10 Buttons"],
  ["inputs", "11 Inputs"],
  ["select", "12 Select & Combobox"],
  ["dropdown", "13 Dropdown"],
  ["navigation", "14 Navigation"],
  ["overlays", "15 Overlays"],
  ["tables", "16 Tables"],
  ["cards", "17 Cards"],
  ["forms", "18 Forms"],
  ["empty", "19 Empty & Loading"],
  ["notifications", "20 Notifications"],
  ["ai", "21 AI Patterns"],
  ["composition", "22 Composition"],
  ["extras", "23 Operational extras"],
] as const;

const surfaces = [
  ["canvas", "--bg-canvas", "oklch(.13 .008 250)"],
  ["base", "--bg-base", "oklch(.16 .008 250)"],
  ["raised", "--bg-raised", "oklch(.19 .009 250)"],
  ["overlay", "--bg-overlay", "oklch(.22 .010 250)"],
  ["sunken", "--bg-sunken", "inputs, code blocks"],
  ["hover", "--bg-hover", "row, item hover"],
  ["active", "--bg-active", "selected, pressed"],
  ["accent-soft", "--accent-soft", "14% accent overlay"],
] as const;

const semanticColors = [
  ["success", "--success", "completed, healthy"],
  ["warning", "--warning", "attention, awaiting"],
  ["danger", "--danger", "failure, destructive"],
  ["info", "--info", "neutral signal"],
] as const;

const typographyScale = [
  ["p1", "18 / 1.55", "feature copy, opening paragraphs"],
  ["p2", "16 / 1.55", "primary body text in dialogs"],
  ["p3", "14 / 1.55", "default UI body"],
  ["p4", "13 / 1.5", "helper text, sidebar items"],
  ["p5", "12 / 1.45", "meta, table cells"],
  ["p6", "11 / 1.4", "captions, timestamps"],
] as const;

const navItems = [
  { label: "Overview", icon: Home, badge: "42" },
  { label: "Company brain", icon: Brain },
  { label: "Skills", icon: Sparkles },
  { label: "Workflows", icon: WandSparkles },
  { label: "Studio", icon: LayoutTemplate },
  { label: "Reports", icon: TableProperties },
  { label: "Queue", icon: Clock3 },
  { label: "Activity", icon: Activity },
] as Array<{
  label: string;
  icon: typeof Home;
  badge?: string;
}>;

const runs = [
  [
    "Generate LinkedIn carousel",
    "7f3a8c",
    "14:02:33",
    "12.4s",
    "$0.0238",
    "Completed",
  ],
  [
    "Generate landing page",
    "9a14e2",
    "13:58:11",
    "28.7s",
    "$0.1042",
    "Awaiting approval",
  ],
  ["Sync invoices · Stripe", "be02f5", "13:51:02", "8m 22s", "-", "Running"],
  [
    "Schedule social burst",
    "3c8b91",
    "13:42:00",
    "2.1s",
    "$0.0004",
    "Failed · auth expired",
  ],
] as const;

const toneOptions = [
  "Confident",
  "Direct",
  "Warm",
  "Playful",
  "Technical",
  "Formal",
];
const iconSet = [
  Home,
  Brain,
  WandSparkles,
  LayoutTemplate,
  Search,
  Bell,
  Filter,
  FolderOpen,
  FileText,
  Users,
  Settings,
];

const onboardingSchema = z.object({
  workspaceName: z
    .string()
    .min(3, "At least 3 characters")
    .max(60, "Max 60 characters"),
  voice: z.string().min(10, "Tell Aurora a little more about your voice"),
  tone: z.array(z.string()).min(1, "Pick at least one tone").max(3, "Max 3"),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

const chartData = [
  { day: "Mon", runs: 142, cost: 9.4 },
  { day: "Tue", runs: 198, cost: 12.1 },
  { day: "Wed", runs: 167, cost: 10.9 },
  { day: "Thu", runs: 240, cost: 14.8 },
  { day: "Fri", runs: 312, cost: 18.2 },
  { day: "Sat", runs: 96, cost: 5.7 },
  { day: "Sun", runs: 129, cost: 7.3 },
];

const chartConfig: ChartConfig = {
  runs: { label: "Runs", color: "var(--chart-3)" },
  cost: { label: "Cost (USD)", color: "var(--chart-2)" },
};

type RunRow = {
  skill: string;
  runId: string;
  duration: string;
  status: "Completed" | "Awaiting approval" | "Running" | "Failed";
};

const runRows: RunRow[] = [
  {
    skill: "Generate LinkedIn carousel",
    runId: "7f3a8c",
    duration: "12.4s",
    status: "Completed",
  },
  {
    skill: "Generate landing page",
    runId: "9a14e2",
    duration: "28.7s",
    status: "Awaiting approval",
  },
  {
    skill: "Sync invoices",
    runId: "be02f5",
    duration: "8m 22s",
    status: "Running",
  },
  {
    skill: "Schedule social burst",
    runId: "3c8b91",
    duration: "2.1s",
    status: "Failed",
  },
  {
    skill: "Monthly digest",
    runId: "4d9f10",
    duration: "4.2s",
    status: "Completed",
  },
  {
    skill: "Stripe reconcile",
    runId: "21abf0",
    duration: "1m 03s",
    status: "Completed",
  },
];

const runColumns: ColumnDef<RunRow>[] = [
  {
    accessorKey: "skill",
    header: "Skill",
    cell: ({ row }) => (
      <span className="font-medium text-[var(--fg-primary)]">
        {row.original.skill}
      </span>
    ),
  },
  {
    accessorKey: "runId",
    header: "Run ID",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">{row.original.runId}</span>
    ),
  },
  {
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.duration}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const variant =
        status === "Failed"
          ? "destructive"
          : status === "Running"
            ? "info"
            : status === "Awaiting approval"
              ? "warning"
              : "success";
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
];

export function DesignSystemPage() {
  const { theme, setTheme } = useTheme();
  const [commandOpen, setCommandOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("aurora-pro");
  const [publishMode, setPublishMode] = useState("direct");
  const [budgetCap, setBudgetCap] = useState(72);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(
    new Date(2026, 4, 13),
  );
  const [otp, setOtp] = useState("");

  const onboardingForm = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      workspaceName: "AIBusiness OS",
      voice:
        "Write like a precise operator. Keep sentences compact, skip filler, and always end with a clear next action.",
      tone: ["Confident", "Direct", "Technical"],
    },
    mode: "onBlur",
  });
  const motionItems = useMemo(
    () => [
      ["instant", "80ms"],
      ["fast", "140ms"],
      ["base", "200ms"],
      ["slow", "320ms"],
      ["slower", "520ms"],
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--fg-primary)]">
      <CommandDialog
        open={commandOpen}
        onOpenChange={setCommandOpen}
        title="Command menu"
        description="Suggested actions and navigation."
      >
        <CommandInput placeholder="Search or jump to..." />
        <CommandList>
          <CommandEmpty>No matches found.</CommandEmpty>
          <CommandGroup heading="Suggested actions">
            <CommandItem>
              <Sparkles />
              Generate landing page
              <CommandShortcut>enter</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <FileText />5 social posts for Q4
              <CommandShortcut>2h</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Navigate">
            <CommandItem>
              <WandSparkles />
              Go to Automations
              <CommandShortcut>open</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <div className="mx-auto flex max-w-[1440px] gap-8 px-5 py-8 lg:px-8">
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 overflow-y-auto border-r border-[var(--line-subtle)] pr-6 pt-2 xl:block">
          <div className="mb-8 flex items-center gap-3 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3 shadow-[var(--shadow-xs)]">
            <div className="flex size-11 items-center justify-center rounded-[18px] bg-[var(--accent)] text-white shadow-[var(--shadow-glow)]">
              <span className="text-2xl font-semibold">A</span>
            </div>
            <div>
              <p className="text-sm font-medium">AIBusiness OS</p>
              <p className="text-[12px] text-[var(--fg-tertiary)]">
                Design System · v0.1
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="mb-2 text-[11px] font-medium tracking-[0.12em] text-[var(--fg-quaternary)] uppercase">
              Foundations & Components
            </p>
            {toc.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="flex rounded-[var(--r-md)] px-3 py-2 text-[13px] text-[var(--fg-secondary)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]"
              >
                {label}
              </a>
            ))}
          </div>

          <Separator className="my-6 bg-[var(--line-subtle)]" />
          <div className="flex items-center gap-2 rounded-[var(--r-md)] bg-[var(--bg-base)] p-1">
            <Button
              variant={theme === "dark" ? "flat" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setTheme("dark")}
            >
              <Moon data-icon="inline-start" />
              Dark
            </Button>
            <Button
              variant={theme === "light" ? "flat" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setTheme("light")}
            >
              <Sun data-icon="inline-start" />
              Light
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-14 pb-20">
          <section className="rounded-[var(--r-2xl)] border border-[var(--line-default)] bg-[var(--bg-base)] p-8 shadow-[var(--shadow-lg)]">
            <div className="mb-5 flex flex-wrap items-center gap-3 text-[12px] text-[var(--fg-tertiary)]">
              <Badge variant="outline">v0.1 · DESIGN SYSTEM</Badge>
              <span>BUILT MAY 13, 2026</span>
              <span>NEXT.JS · TAILWIND · SHADCN</span>
            </div>
            <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="space-y-5">
                <p className="font-serif text-5xl italic tracking-[-0.04em] text-[var(--fg-primary)] md:text-6xl">
                  Calibrate. A complete brain.
                </p>
                <p className="max-w-2xl text-[18px] leading-[1.55] text-[var(--fg-secondary)]">
                  A system tuned for calm, capable, sharp operations. Dense on
                  purpose, with one accent, one voice and AI patterns that stay
                  visible without becoming theatrical.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="success">Calm · Capable · Sharp</Badge>
                  <Badge variant="outline">Density: high, on purpose</Badge>
                  <Badge variant="secondary">Geist + Instrument Serif</Badge>
                </div>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Q4 cashflow updated</CardTitle>
                  <CardDescription>
                    3 anomalies detected — Aurora reviewed at 14:02
                  </CardDescription>
                  <CardAction>
                    <Badge variant="success">live</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-quaternary)]">
                        FY 2026
                      </p>
                      <p className="tabular-nums text-3xl font-medium">
                        $1,284,902
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-quaternary)]">
                        Growth
                      </p>
                      <p className="tabular-nums text-3xl font-medium text-[var(--success)]">
                        +12.4%
                      </p>
                    </div>
                  </div>
                  <Separator className="bg-[var(--line-subtle)]" />
                  <div className="grid gap-2 text-[12px] text-[var(--fg-secondary)]">
                    <div className="flex items-center justify-between">
                      <span>CAMPAIGN</span>
                      <span>Q4-launch</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>STATUS</span>
                      <span>running</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>BUDGET</span>
                      <span>$42,500</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <DsSection
            id="brand"
            eyebrow="01 · Brand"
            title="Instruments, not posters."
            description="The system keeps one hero color, a restrained serif display voice, and operational density with breathing room. AI stays visible, never noisy."
          >
            <div className="grid gap-6 md:grid-cols-3">
              {[
                "The AI is visible, never showy.",
                "Latency is a feature.",
                "One accent. One voice.",
              ].map((item, index) => (
                <Card key={item}>
                  <CardHeader>
                    <CardTitle>
                      Principle {String(index + 1).padStart(2, "0")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[14px] leading-7 text-[var(--fg-secondary)]">
                      {item}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DsSection>

          <DsSection
            id="color"
            eyebrow="02 · Color"
            title="A palette tuned for long sessions"
            description="Surfaces stack deliberately, the accent stays rare, and semantic colors work as operational signals instead of decorative flourishes."
          >
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <DsStage>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {surfaces.map(([name, cssVar, hint]) => (
                    <div
                      key={name}
                      className="rounded-[var(--r-lg)] border border-[var(--line-default)] p-3"
                    >
                      <div
                        className="mb-3 h-20 rounded-[var(--r-md)] border border-[var(--line-subtle)]"
                        style={{ background: `var(${cssVar})` }}
                      />
                      <p className="text-sm font-medium">{name}</p>
                      <p className="mt-1 font-mono text-[11px] text-[var(--fg-quaternary)]">
                        {cssVar}
                      </p>
                      <p className="mt-2 text-[12px] text-[var(--fg-tertiary)]">
                        {hint}
                      </p>
                    </div>
                  ))}
                </div>
              </DsStage>
              <DsStage>
                <div className="space-y-4">
                  <div>
                    <p className="mb-3 text-sm font-medium">
                      OS-Iris · accent ramp
                    </p>
                    <div className="grid grid-cols-6 gap-2">
                      {[0.92, 0.84, 0.74, 0.58, 0.52, 0.43].map(
                        (lightness, index) => (
                          <div key={lightness} className="space-y-2">
                            <div
                              className="h-14 rounded-[var(--r-md)]"
                              style={{
                                background: `oklch(${lightness} 0.24 265)`,
                              }}
                            />
                            <p className="text-center text-[11px] text-[var(--fg-quaternary)]">
                              {index === 3 ? "500" : `${(index + 1) * 100}`}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                  <Separator className="bg-[var(--line-subtle)]" />
                  <div className="grid gap-3 md:grid-cols-2">
                    {semanticColors.map(([name, cssVar, hint]) => (
                      <div
                        key={name}
                        className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3"
                      >
                        <div
                          className="size-9 rounded-full"
                          style={{ background: `var(${cssVar})` }}
                        />
                        <div>
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-[12px] text-[var(--fg-tertiary)]">
                            {hint}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </DsStage>
            </div>
          </DsSection>

          <DsSection
            id="type"
            eyebrow="03 · Typography"
            title="A type system for operators."
            description="Geist for everything functional — clean, sharp, neutral. Geist Mono for tokens, identifiers, and numerics. Instrument Serif only for editorial moments. Three weights total: 400, 500, 600."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-[11px] font-medium tracking-[0.12em] text-[var(--fg-quaternary)] uppercase">
                  Display · Instrument Serif
                </p>
                <Card>
                  <CardContent className="space-y-5 pt-6">
                    <div className="space-y-2">
                      <Display level="d1" as="p">
                        Calibrate.
                      </Display>
                      <Display level="d2" as="p">
                        A complete brain.
                      </Display>
                      <Display level="d3" as="p">
                        An operator&apos;s instrument.
                      </Display>
                    </div>
                    <Separator className="bg-[var(--line-subtle)]" />
                    <div className="grid gap-1 font-mono text-[12px] text-[var(--fg-quaternary)]">
                      <span>display-1 · 88/0.96/-0.030</span>
                      <span>display-2 · 56/1.00/-0.025</span>
                      <span>display-3 · 40/1.05/-0.020 · italic</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-medium tracking-[0.12em] text-[var(--fg-quaternary)] uppercase">
                  UI · Geist
                </p>
                <Card>
                  <CardContent className="space-y-2 pt-6">
                    <Heading level="h1">Workspace overview</Heading>
                    <Heading level="h2">Automations</Heading>
                    <Heading level="h3">Approval queue · 12</Heading>
                    <Heading level="h4">Q4 campaign brief</Heading>
                    <Heading level="h5">Recent executions</Heading>
                    <Heading level="h6">Synced 14 seconds ago</Heading>
                    <Separator className="my-3 bg-[var(--line-subtle)]" />
                    <div className="grid gap-1 font-mono text-[12px] text-[var(--fg-quaternary)]">
                      <span>h1 40 / 600 / -0.020 · page titles</span>
                      <span>h2 30 / 600 / -0.018 · section heads</span>
                      <span>h3 22 / 600 / -0.012 · subsections</span>
                      <span>h4 18 / 600 / -0.008 · card titles</span>
                      <span>h5 15 / 600 / -0.004 · panel titles</span>
                      <span>h6 13 / 600 / 0 · group labels</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-medium tracking-[0.12em] text-[var(--fg-quaternary)] uppercase">
                  Body
                </p>
                <Card>
                  <CardContent className="space-y-2 pt-6">
                    <Paragraph size="p1">
                      p1 · 18 / 1.55 · feature copy, opening paragraphs of
                      long-form docs.
                    </Paragraph>
                    <Paragraph size="p2">
                      p2 · 16 / 1.55 · primary body text in narrative views and
                      dialogs.
                    </Paragraph>
                    <Paragraph size="p3">
                      p3 · 14 / 1.55 · default UI body. The workhorse size.
                    </Paragraph>
                    <Paragraph size="p4" tone="tertiary">
                      p4 · 13 / 1.5 · helper text, secondary descriptions,
                      sidebar items.
                    </Paragraph>
                    <Paragraph size="p5" tone="tertiary">
                      p5 · 12 / 1.45 · meta, breadcrumbs, table cells.
                    </Paragraph>
                    <Paragraph size="p6" tone="quaternary">
                      p6 · 11 / 1.4 · captions, timestamps, footnotes.
                    </Paragraph>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-medium tracking-[0.12em] text-[var(--fg-quaternary)] uppercase">
                  Functional
                </p>
                <Card>
                  <CardContent className="space-y-3 pt-6">
                    <div className="space-y-1">
                      <Paragraph size="p4" tone="secondary">
                        Label · field labels
                      </Paragraph>
                      <Paragraph
                        size="p6"
                        tone="quaternary"
                        className="uppercase tracking-[0.12em]"
                      >
                        Overline · section dividers
                      </Paragraph>
                      <Paragraph size="p6" tone="quaternary">
                        Caption · contextual hints, timestamps
                      </Paragraph>
                      <p className="font-mono text-[12px] text-[var(--fg-tertiary)] tabular-nums">
                        mono · run_id · 7f3a8c · 14:02:33Z
                      </p>
                    </div>
                    <Separator className="bg-[var(--line-subtle)]" />
                    <div className="space-y-1">
                      <p className="font-medium text-[28px] tabular-nums text-[var(--fg-primary)]">
                        $1,284,902
                      </p>
                      <p className="font-medium text-[16px] tabular-nums text-[var(--success)]">
                        +12.4%
                      </p>
                    </div>
                    <Separator className="bg-[var(--line-subtle)]" />
                    <div className="space-y-1">
                      <Paragraph
                        size="p6"
                        tone="quaternary"
                        className="uppercase tracking-[0.12em]"
                      >
                        Campaign · status · budget
                      </Paragraph>
                      <Paragraph size="p4" tone="secondary">
                        Q4-launch · running · $42,500
                      </Paragraph>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {[
                [
                  "Rule 01",
                  "Headings use letter-spacing in the negative range from -0.022em (h1) to 0 (h6). The bigger the size, the tighter the tracking.",
                ],
                [
                  "Rule 02",
                  "Numerics always use font-variant-numeric: tabular-nums. Currency, percentages, counts, durations — they all stack.",
                ],
                [
                  "Rule 03",
                  "Mono is reserved for things that have a literal exact value: IDs, tokens, timestamps, code, model names, run hashes.",
                ],
              ].map(([label, body]) => (
                <Card key={label}>
                  <CardContent className="space-y-2 pt-5">
                    <Paragraph
                      size="p6"
                      tone="quaternary"
                      className="uppercase tracking-[0.12em]"
                    >
                      {label}
                    </Paragraph>
                    <Paragraph size="p4" tone="tertiary">
                      {body}
                    </Paragraph>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DsSection>

          <DsSection
            id="space"
            eyebrow="04 · Spacing"
            title="4-based scale, with tighter stops where data lives"
            description="The layout feels dense because the system avoids decorative whitespace and instead uses a disciplined spacing ladder across cards, forms, menus and tables."
          >
            <DsStage>
              <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
                {[
                  "2px",
                  "4px",
                  "6px",
                  "8px",
                  "10px",
                  "12px",
                  "16px",
                  "24px",
                  "32px",
                  "48px",
                  "64px",
                ].map((value) => (
                  <div
                    key={value}
                    className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3"
                  >
                    <div
                      className="mb-3 h-3 rounded-full bg-[var(--accent)]"
                      style={{ width: value }}
                    />
                    <p className="font-mono text-[12px] text-[var(--fg-quaternary)]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </DsStage>
          </DsSection>

          <DsSection
            id="radius"
            eyebrow="05 · Radius"
            title="Quiet corners. Nothing playful."
            description="Corners stay controlled so the product looks like instrumentation, not consumer social UI."
          >
            <div className="grid gap-3 md:grid-cols-6">
              {["4", "6", "8", "12", "16", "22"].map((value) => (
                <div
                  key={value}
                  className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3 text-center"
                >
                  <div
                    className="mx-auto mb-3 size-16 bg-[var(--accent)]"
                    style={{ borderRadius: `${value}px` }}
                  />
                  <p className="text-sm font-medium">{value}px</p>
                </div>
              ))}
            </div>
          </DsSection>

          <DsSection
            id="elevation"
            eyebrow="06 · Elevation"
            title="Five shadow steps. One glow reserved for action."
            description="Most surfaces stay grounded. The glow exists for rare, intentional calls to action or AI moments in motion."
          >
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              {["xs", "sm", "md", "lg", "xl", "glow"].map((shadow) => (
                <div
                  key={shadow}
                  className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4"
                >
                  <div
                    className="mb-4 h-20 rounded-[var(--r-md)] bg-[var(--bg-raised)]"
                    style={{ boxShadow: `var(--shadow-${shadow})` }}
                  />
                  <p className="text-sm font-medium">{shadow}</p>
                </div>
              ))}
            </div>
          </DsSection>

          <DsSection
            id="borders"
            eyebrow="07 · Borders"
            title="Hairlines do the structural work"
            description="The system relies on subtle, default and strong lines to differentiate surfaces, control edges and focus states."
          >
            <div className="grid gap-4 md:grid-cols-3">
              {["subtle", "default", "strong"].map((line) => (
                <div
                  key={line}
                  className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4"
                >
                  <div
                    className="mb-3 h-16 rounded-[var(--r-md)] border"
                    style={{ borderColor: `var(--line-${line})` }}
                  />
                  <p className="text-sm font-medium">{line}</p>
                </div>
              ))}
            </div>
          </DsSection>

          <DsSection
            id="icons"
            eyebrow="08 · Icons"
            title="Lucide-style strokes, sized to the type they sit beside"
            description="Icons remain supportive. Sizes scale with context: inline, buttons, nav, headers and empty states."
          >
            <DsStage className="grid gap-4 md:grid-cols-4 xl:grid-cols-6">
              {iconSet.map((Icon, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4 text-center"
                >
                  <Icon className="size-5 text-[var(--fg-secondary)]" />
                  <p className="text-[12px] text-[var(--fg-quaternary)]">
                    18px · nav
                  </p>
                </div>
              ))}
            </DsStage>
          </DsSection>

          <DsSection
            id="motion"
            eyebrow="09 · Motion"
            title="Fast, predictable, mechanical"
            description="No cinematic slides. The system prefers opacity, short translations and controlled pulses to signal progress, loading and confirmation."
          >
            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Durations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {motionItems.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-subtle)] p-3"
                    >
                      <span className="text-sm font-medium">{label}</span>
                      <span className="font-mono text-[12px] text-[var(--fg-quaternary)]">
                        {value}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <DsStage className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
                  <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                    <span className="ds-ai-pulse size-2 rounded-full bg-[var(--accent)]" />
                    AI thinking
                  </div>
                  <p className="text-[13px] text-[var(--fg-tertiary)]">
                    Three-dot pulse at 1.2s ease-in-out infinite.
                  </p>
                </div>
                <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
                  <div className="ds-check-pop mb-4 inline-flex size-9 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--success)_16%,transparent)] text-[var(--success)]">
                    <Check className="size-4" />
                  </div>
                  <p className="text-[13px] text-[var(--fg-tertiary)]">
                    Checkmark pop with spring timing.
                  </p>
                </div>
                <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
                  <Skeleton className="h-9 w-full" />
                  <p className="mt-4 text-[13px] text-[var(--fg-tertiary)]">
                    Skeleton shimmer with 1.6s linear cycle.
                  </p>
                </div>
              </DsStage>
            </div>
          </DsSection>

          <DsSection
            id="buttons"
            eyebrow="10 · Buttons"
            title="Five variants. Multiple sizes. Clear states."
            description="Primary glow is rare, outline and ghost handle most utility actions, and destructive stays explicit. Loading and full-width states must feel native, not bolted on."
          >
            <DsStage className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <Button>
                  <Sparkles data-icon="inline-start" />
                  Generate brief
                </Button>
                <Button variant="flat">Save draft</Button>
                <Button variant="outline">Cancel</Button>
                <Button variant="ghost">Skip</Button>
                <Button variant="destructive">Delete run</Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="xs">XS</Button>
                <Button size="sm" variant="secondary">
                  SM
                </Button>
                <Button size="default" variant="outline">
                  MD
                </Button>
                <Button size="lg" variant="ghost">
                  LG
                </Button>
                <Button size="xl">
                  <Play data-icon="inline-start" />
                  Run automation
                </Button>
                <Button size="icon" variant="outline">
                  <Search />
                </Button>
                <Button disabled>
                  <Loader2 className="animate-spin" />
                  Loading
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Button className="w-full justify-between">
                  <span>Generate post</span>
                  <ChevronRight />
                </Button>
                <div className="flex gap-2 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] p-1">
                  <Button variant="flat" className="flex-1">
                    Publish
                  </Button>
                  <Button variant="ghost" size="icon">
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </DsStage>
          </DsSection>

          <DsSection
            id="inputs"
            eyebrow="11 · Inputs"
            title="Text fields that respect the data they hold"
            description="Labels stay quiet, helper copy is specific, and states explain themselves with no theatrical styling."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <DsStage className="space-y-4">
                <DsField
                  label="Workspace name"
                  helper="3–60 characters. Shown across the platform."
                >
                  <Input defaultValue="AIBusiness OS" />
                </DsField>
                <DsField
                  label="Search runs"
                  helper="With icon affix and keyboard access hint."
                >
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-quaternary)]" />
                    <Input className="pl-9 pr-14" placeholder="Search runs" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Kbd>⌘K</Kbd>
                    </span>
                  </div>
                </DsField>
                <DsField label="Email" helper="Email is missing a domain.">
                  <Input aria-invalid defaultValue="ana@acme" />
                </DsField>
              </DsStage>
              <DsStage className="space-y-4">
                <DsField
                  label="Prompt input"
                  helper="Press ⌘ ↵ to send · 132 / 2000"
                >
                  <Textarea defaultValue="Write three LinkedIn posts about our Q4 launch. Match our usual voice — short sentences, no jargon, end with a question." />
                </DsField>
                <DsField
                  label="API key"
                  helper="Rotate every 90 days. Last rotated 14 days ago."
                >
                  <Input
                    type="password"
                    defaultValue="sk_live_aurora_q4_93492"
                  />
                </DsField>
              </DsStage>
            </div>
          </DsSection>

          <DsSection
            id="select"
            eyebrow="12 · Select & Combobox"
            title="Searchable by default."
            description="Closed selects stay compact, open lists feel operational, and multi-selection should make approvals and ownership readable at a glance."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardContent className="space-y-3 pt-5">
                  <Paragraph
                    size="p6"
                    tone="quaternary"
                    className="uppercase tracking-[0.14em]"
                  >
                    Closed · select
                  </Paragraph>
                  <DsField label="AI model">
                    <Select
                      defaultValue={selectedModel}
                      onValueChange={setSelectedModel}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Reasoning</SelectLabel>
                          <SelectItem value="aurora-pro">
                            Aurora-Pro · best-effort
                          </SelectItem>
                          <SelectItem value="aurora-fast">
                            Aurora-Fast · everyday tasks
                          </SelectItem>
                          <SelectItem value="aurora-embed">
                            Aurora-Embed-v2 · 1536d
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </DsField>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-3 pt-5">
                  <Paragraph
                    size="p6"
                    tone="quaternary"
                    className="uppercase tracking-[0.14em]"
                  >
                    Multi-select · tags
                  </Paragraph>
                  <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                    Approvers
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--r-md)] border border-[var(--line-strong)] bg-[var(--bg-sunken)] px-2 py-1.5">
                    {[
                      {
                        ic: "AS",
                        name: "Ana Silva",
                        color:
                          "from-[oklch(0.78_0.14_280)] to-[oklch(0.62_0.20_295)]",
                      },
                      {
                        ic: "LM",
                        name: "Luis Mota",
                        color:
                          "from-[oklch(0.78_0.16_30)] to-[oklch(0.66_0.18_15)]",
                      },
                      {
                        ic: "RT",
                        name: "Rafa Tavares",
                        color:
                          "from-[oklch(0.78_0.13_180)] to-[oklch(0.62_0.16_175)]",
                      },
                    ].map((p) => (
                      <span
                        key={p.name}
                        className="inline-flex items-center gap-1.5 rounded-[var(--r-sm)] bg-[var(--bg-raised)] py-0.5 pl-0.5 pr-1.5 text-[12px] text-[var(--fg-primary)]"
                      >
                        <Avatar className="size-5">
                          <AvatarFallback className="text-[9px]">
                            {p.ic}
                          </AvatarFallback>
                        </Avatar>
                        {p.name}
                        <button
                          type="button"
                          aria-label={`Remove ${p.name}`}
                          className="text-[var(--fg-quaternary)] transition-colors hover:text-[var(--fg-primary)]"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      className="flex-1 bg-transparent text-[12.5px] text-[var(--fg-primary)] outline-none placeholder:text-[var(--fg-quaternary)]"
                      defaultValue="asd"
                    />
                  </div>
                  <Paragraph size="p5" tone="tertiary">
                    2 approvals required for publish.
                  </Paragraph>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardContent className="space-y-3 pt-5">
                  <Paragraph
                    size="p6"
                    tone="quaternary"
                    className="uppercase tracking-[0.14em]"
                  >
                    Open · combobox
                  </Paragraph>
                  <DsField label="AI model">
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-quaternary)]" />
                        <Input
                          defaultValue="aur"
                          className="border-[var(--accent)] pl-9 ring-[3px] ring-[var(--ring-focus)]"
                        />
                      </div>
                      <div className="overflow-hidden rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] shadow-[var(--shadow-md)]">
                        <div className="border-b border-[var(--line-subtle)] px-3 py-2">
                          <Paragraph
                            size="p6"
                            tone="quaternary"
                            className="uppercase tracking-[0.14em]"
                          >
                            Reasoning
                          </Paragraph>
                        </div>
                        {[
                          {
                            icon: Brain,
                            name: "Aurora-Pro",
                            aurBold: "Aur",
                            rest: "ora-Pro",
                            meta: "Slowest · highest reasoning · $0.012/1k tok",
                            active: true,
                          },
                          {
                            icon: Zap,
                            name: "Aurora-Fast",
                            aurBold: "Aur",
                            rest: "ora-Fast",
                            meta: "Fast · everyday tasks · $0.002/1k tok",
                          },
                        ].map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <div
                              key={opt.name}
                              data-active={opt.active}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5",
                                opt.active
                                  ? "bg-[var(--bg-hover)]"
                                  : "hover:bg-[var(--bg-hover)]",
                              )}
                            >
                              <span className="flex size-7 items-center justify-center rounded-[var(--r-sm)] border border-[var(--line-default)] bg-[var(--bg-sunken)] text-[var(--fg-secondary)]">
                                <Icon className="size-3.5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] text-[var(--fg-primary)]">
                                  <strong className="font-semibold">
                                    {opt.aurBold}
                                  </strong>
                                  <span className="font-normal">
                                    {opt.rest}
                                  </span>
                                </p>
                                <p className="truncate text-[11.5px] text-[var(--fg-tertiary)]">
                                  {opt.meta}
                                </p>
                              </div>
                              {opt.active ? (
                                <Check className="size-4 text-[var(--fg-tertiary)]" />
                              ) : null}
                            </div>
                          );
                        })}
                        <div className="border-y border-[var(--line-subtle)] bg-[var(--bg-base)] px-3 py-2">
                          <Paragraph
                            size="p6"
                            tone="quaternary"
                            className="uppercase tracking-[0.14em]"
                          >
                            Embedding
                          </Paragraph>
                        </div>
                        <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--bg-hover)]">
                          <span className="flex size-7 items-center justify-center rounded-[var(--r-sm)] border border-[var(--line-default)] bg-[var(--bg-sunken)] text-[var(--fg-secondary)]">
                            <FileText className="size-3.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] text-[var(--fg-primary)]">
                              <strong className="font-semibold">Aur</strong>
                              <span className="font-normal">ora-Embed-v2</span>
                            </p>
                            <p className="truncate text-[11.5px] text-[var(--fg-tertiary)]">
                              1536d · multilingual
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DsField>
                </CardContent>
              </Card>
            </div>
          </DsSection>

          <DsSection
            id="dropdown"
            eyebrow="13 · Dropdown menus"
            title="Actions, profiles, context — same anatomy."
            description="Menus always carry a leading icon and trailing shortcut where possible. Destructive items live at the bottom, separated by a divider, in red. Submenus open to the right with an 80ms intent delay to prevent accidental triggers."
          >
            <div className="grid gap-6 lg:grid-cols-3">
              <DsStage className="flex flex-col gap-3">
                <Paragraph
                  size="p6"
                  tone="quaternary"
                  className="uppercase tracking-[0.14em]"
                >
                  Action · row menu
                </Paragraph>
                <DropdownMenu open>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon-sm">
                      <Ellipsis />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-60">
                    <DropdownMenuItem>
                      <Eye />
                      View run details
                      <DropdownMenuShortcut>E</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Zap />
                      Re-run
                      <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText />
                      Duplicate as draft
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <ChevronRight />
                      Export
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive">
                      <Trash2 />
                      Delete run
                      <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </DsStage>

              <DsStage className="flex flex-col gap-3">
                <Paragraph
                  size="p6"
                  tone="quaternary"
                  className="uppercase tracking-[0.14em]"
                >
                  Profile
                </Paragraph>
                <DropdownMenu open>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 pl-1.5">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-[10px]">
                          AS
                        </AvatarFallback>
                      </Avatar>
                      Ana Silva
                      <ChevronRight className="size-3 rotate-90 text-[var(--fg-quaternary)]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <div className="flex items-center gap-3 p-2">
                      <Avatar className="size-10">
                        <AvatarFallback className="text-[12px]">
                          AS
                        </AvatarFallback>
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
                      <Badge
                        variant="default"
                        className="ml-auto rounded-[var(--r-xs)] px-1.5 py-0 text-[10px]"
                      >
                        Free
                      </Badge>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Moon />
                      Theme
                      <span className="ml-auto text-[11.5px] text-[var(--fg-tertiary)]">
                        Dark
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      Sign out
                      <DropdownMenuShortcut>⇧Q</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </DsStage>

              <DsStage className="flex flex-col gap-3">
                <Paragraph
                  size="p6"
                  tone="quaternary"
                  className="uppercase tracking-[0.14em]"
                >
                  Nested · with submenu
                </Paragraph>
                <DropdownMenu open>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem>
                      <Eye />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuSub open>
                      <DropdownMenuSubTrigger>
                        <ArrowUpRight />
                        Send to…
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent className="w-56">
                          <DropdownMenuItem>Slack #marketing</DropdownMenuItem>
                          <DropdownMenuItem>
                            Email to approvers
                          </DropdownMenuItem>
                          <DropdownMenuItem>Webhook · Zapier</DropdownMenuItem>
                          <DropdownMenuItem>Custom endpoint…</DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuItem>
                      <FileText />
                      Copy as Markdown
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </DsStage>
            </div>
          </DsSection>

          <DsSection
            id="navigation"
            eyebrow="14 · Navigation"
            title="Sidebar-first. Workspaces always visible."
            description="Operators live in the sidebar — they need workspace context, the AI assistant, and counts visible at all times. Top-nav exists only for utility. Mobile collapses the sidebar into a sheet but keeps the workspace switcher pinned."
          >
            <div className="relative rounded-[var(--r-xl)] border border-[var(--line-subtle)] bg-[var(--bg-canvas)] p-4">
              <Paragraph
                size="p6"
                tone="quaternary"
                className="absolute right-4 top-3 uppercase tracking-[0.14em]"
              >
                click toggle to expand / collapse
              </Paragraph>
              <AppSidebar defaultOpen showToggle />
            </div>
          </DsSection>

          <DsSection
            id="overlays"
            eyebrow="15 · Modals & overlays"
            title="Used sparingly. Never to hide complexity."
            description="Modals confirm, drawers inspect, popovers filter, tooltips clarify. Layering should feel mechanical and predictable."
          >
            <DsStage className="flex flex-wrap items-center gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Delete automation</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      Delete automation &quot;Q4 Lead Nurture&quot;?
                    </DialogTitle>
                    <DialogDescription>
                      This will stop 1,284 in-flight workflow runs and remove
                      all historical execution data. This action cannot be
                      undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DsField label="Type delete-q4-nurture to confirm">
                    <Input defaultValue="delete-q4-nurture" />
                  </DsField>
                  <DialogFooter>
                    <Button variant="ghost">Cancel</Button>
                    <Button variant="destructive">Delete automation</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Drawer direction="right">
                <DrawerTrigger asChild>
                  <Button variant="outline">Inspect run drawer</Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Run · 7f3a8c</DrawerTitle>
                    <DrawerDescription>
                      14:02:33Z · Aurora-Pro
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="space-y-4 px-4 pb-4 text-sm">
                    <div className="grid gap-2 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
                      <span className="text-[var(--fg-tertiary)]">Status</span>
                      <span>Completed in 12.4s</span>
                    </div>
                    <div className="grid gap-2 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
                      <span className="text-[var(--fg-tertiary)]">Output</span>
                      <span>
                        3 LinkedIn drafts generated and queued for approval.
                      </span>
                    </div>
                  </div>
                  <DrawerFooter>
                    <Button variant="flat">Approve output</Button>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <Filter data-icon="inline-start" />
                    Filter
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <div className="space-y-4">
                    <p className="text-sm font-medium">By status</p>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Checkbox id="filter-completed" defaultChecked />
                        <label htmlFor="filter-completed">
                          Completed <Badge variant="secondary">412</Badge>
                        </label>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Checkbox id="filter-awaiting" />
                        <label htmlFor="filter-awaiting">
                          Awaiting approval
                        </label>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Checkbox id="filter-failed" />
                        <label htmlFor="filter-failed">Failed</label>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost">
                    <Bell data-icon="inline-start" />
                    Tooltip
                  </Button>
                </TooltipTrigger>
                <TooltipContent>z 100 · command palette</TooltipContent>
              </Tooltip>
            </DsStage>
          </DsSection>

          <DsSection
            id="tables"
            eyebrow="16 · Tables"
            title="Operational. Sortable. Bulk-actionable."
            description="Rows expose status, timing and cost with tabular numerics and restrained hover states."
          >
            <Card>
              <CardContent className="space-y-4 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Heading level="h5">Execution history</Heading>
                    <Paragraph size="p5" tone="tertiary">
                      1,284 runs · last 7 days
                    </Paragraph>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-quaternary)]" />
                      <Input
                        className="h-8 w-56 pl-8 text-[12.5px]"
                        placeholder="Search runs…"
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      <Filter className="size-3.5" />
                      Status · 2
                    </Button>
                    <Button variant="outline" size="sm">
                      <ArrowUpRight className="size-3.5 rotate-[-90deg]" />
                      Sort
                    </Button>
                    <Button variant="outline" size="sm">
                      <ArrowUpRight className="size-3.5" />
                      Export
                    </Button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-9">
                          <Checkbox aria-label="Select all" />
                        </TableHead>
                        <TableHead>Skill</TableHead>
                        <TableHead>Run ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        {
                          skill: "Generate LinkedIn carousel",
                          color:
                            "from-[oklch(0.55_0.22_265)] to-[oklch(0.42_0.22_280)]",
                          icon: Sparkles,
                          runId: "7f3a8c",
                          status: "Completed",
                          tone: "success",
                          started: "14:02:33",
                          duration: "12.4s",
                          cost: "$0.0238",
                          selected: false,
                        },
                        {
                          skill: "Generate landing page",
                          color:
                            "from-[oklch(0.55_0.16_240)] to-[oklch(0.42_0.16_250)]",
                          icon: FileText,
                          runId: "9a14e2",
                          status: "Awaiting approval",
                          tone: "warning",
                          started: "13:58:11",
                          duration: "28.7s",
                          cost: "$0.1042",
                          selected: true,
                        },
                        {
                          skill: "Sync invoices · Stripe",
                          color:
                            "from-[oklch(0.55_0.16_55)] to-[oklch(0.42_0.18_45)]",
                          icon: Zap,
                          runId: "be02f5",
                          status: "Running",
                          tone: "neutral",
                          started: "13:51:02",
                          duration: "8m 22s",
                          cost: "—",
                          selected: false,
                        },
                        {
                          skill: "Schedule social burst",
                          color:
                            "from-[oklch(0.55_0.18_22)] to-[oklch(0.42_0.20_18)]",
                          icon: Volume2,
                          runId: "3c8b91",
                          status: "Failed · auth expired",
                          tone: "destructive",
                          started: "13:42:00",
                          duration: "2.1s",
                          cost: "$0.0004",
                          selected: false,
                        },
                        {
                          skill: "Generate monthly report",
                          color:
                            "from-[oklch(0.55_0.16_155)] to-[oklch(0.42_0.18_150)]",
                          icon: LayoutTemplate,
                          runId: "d4f7e0",
                          status: "Completed",
                          tone: "success",
                          started: "13:30:14",
                          duration: "44.8s",
                          cost: "$0.2014",
                          selected: false,
                        },
                      ].map((r) => {
                        const Icon = r.icon;
                        return (
                          <TableRow
                            key={r.runId}
                            data-state={r.selected ? "selected" : undefined}
                            className="hover:bg-[var(--bg-hover)]"
                          >
                            <TableCell>
                              <Checkbox
                                checked={r.selected}
                                aria-label={`Select ${r.skill}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={cn(
                                    "flex size-7 items-center justify-center rounded-[var(--r-sm)] bg-gradient-to-br text-white",
                                    r.color,
                                  )}
                                >
                                  <Icon className="size-3.5" />
                                </span>
                                <span className="font-medium text-[var(--fg-primary)]">
                                  {r.skill}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono tabular-nums text-[var(--fg-secondary)]">
                              {r.runId}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  r.tone === "neutral"
                                    ? "secondary"
                                    : (r.tone as
                                        | "success"
                                        | "warning"
                                        | "destructive")
                                }
                                className="gap-1.5"
                              >
                                <span
                                  className={cn(
                                    "size-1.5 rounded-full",
                                    r.tone === "success" &&
                                      "bg-[var(--success)]",
                                    r.tone === "warning" &&
                                      "bg-[var(--warning)]",
                                    r.tone === "destructive" &&
                                      "bg-[var(--danger)]",
                                    r.tone === "neutral" &&
                                      "bg-[var(--fg-quaternary)] animate-pulse",
                                  )}
                                />
                                {r.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono tabular-nums text-[var(--fg-secondary)]">
                              {r.started}
                            </TableCell>
                            <TableCell className="font-mono tabular-nums text-[var(--fg-secondary)]">
                              {r.duration}
                            </TableCell>
                            <TableCell className="font-mono tabular-nums text-[var(--fg-secondary)]">
                              {r.cost}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon-xs">
                                <Ellipsis className="size-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--fg-tertiary)]">
                  <span>Showing 1–5 of 1,284</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Rows: 25
                    </Button>
                    <Button variant="outline" size="icon-sm">
                      <ChevronRight className="size-3.5 rotate-180" />
                    </Button>
                    <span className="tabular-nums">1 / 52</span>
                    <Button variant="outline" size="icon-sm">
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </DsSection>

          <DsSection
            id="cards"
            eyebrow="17 · Cards"
            title="Four card archetypes carry the entire product."
            description="Metric, automation, generation, and entity. They share padding, header anatomy, and corner radius. They differ in what lives in the body — a number, a workflow, an AI artifact, or an organization. Every card has hover + selected states."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardContent className="space-y-2 pt-5">
                  <div className="flex items-center gap-1.5">
                    <Paragraph
                      size="p6"
                      tone="quaternary"
                      className="uppercase tracking-[0.12em]"
                    >
                      Runs · 7D
                    </Paragraph>
                    <Info className="size-3 text-[var(--fg-quaternary)]" />
                  </div>
                  <p className="text-[44px] leading-none font-semibold tabular-nums tracking-[-0.02em] text-[var(--fg-primary)]">
                    1,284
                  </p>
                  <p className="text-[12.5px] text-[var(--success)]">
                    ▲ 12.4% vs prior 7d
                  </p>
                  <svg viewBox="0 0 120 32" className="mt-1 h-8 w-full">
                    <polyline
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="1.5"
                      points="0,24 15,20 30,22 45,16 60,18 75,14 90,12 105,8 120,10"
                    />
                    <polyline
                      fill="var(--accent-soft)"
                      stroke="none"
                      points="0,24 15,20 30,22 45,16 60,18 75,14 90,12 105,8 120,10 120,32 0,32"
                    />
                  </svg>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-2 pt-5">
                  <Paragraph
                    size="p6"
                    tone="quaternary"
                    className="uppercase tracking-[0.12em]"
                  >
                    Tokens used
                  </Paragraph>
                  <p className="text-[44px] leading-none font-semibold tabular-nums tracking-[-0.02em] text-[var(--fg-primary)]">
                    12.4M
                  </p>
                  <p className="text-[12.5px] text-[var(--warning)]">▲ 8.2%</p>
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-[11px] text-[var(--fg-quaternary)]">
                      <span>Budget</span>
                      <span className="tabular-nums">12.4 / 20.0M</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-sunken)]">
                      <div
                        className="h-full rounded-full bg-[var(--warning)]"
                        style={{ width: "62%" }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-2 pt-5">
                  <Paragraph
                    size="p6"
                    tone="quaternary"
                    className="uppercase tracking-[0.12em]"
                  >
                    Avg latency
                  </Paragraph>
                  <p className="text-[44px] leading-none font-semibold tabular-nums tracking-[-0.02em] text-[var(--fg-primary)]">
                    9.8
                    <span className="text-[20px] text-[var(--fg-tertiary)]">
                      s
                    </span>
                  </p>
                  <p className="text-[12.5px] text-[var(--success)]">
                    ▼ 18% — faster
                  </p>
                  <Paragraph
                    size="p5"
                    tone="quaternary"
                    className="pt-2 tabular-nums"
                  >
                    P95 24.2s · P99 41.0s
                  </Paragraph>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-2 pt-5">
                  <Paragraph
                    size="p6"
                    tone="quaternary"
                    className="uppercase tracking-[0.12em]"
                  >
                    Approval rate
                  </Paragraph>
                  <p className="text-[44px] leading-none font-semibold tabular-nums tracking-[-0.02em] text-[var(--fg-primary)]">
                    94
                    <span className="text-[20px] text-[var(--fg-tertiary)]">
                      %
                    </span>
                  </p>
                  <p className="text-[12.5px] text-[var(--success)]">▲ 1.2pp</p>
                  <div className="flex items-center gap-3 pt-1.5">
                    <svg viewBox="0 0 36 36" className="size-8 -rotate-90">
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke="var(--bg-sunken)"
                        strokeWidth="3"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="3"
                        strokeDasharray={`${(94 / 100) * 94.25} 94.25`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <Paragraph size="p6" tone="tertiary">
                      94 of 100 generations were approved on first review.
                    </Paragraph>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <Card>
                <CardContent className="space-y-4 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
                        <Zap className="size-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Heading level="h5">Q4 Lead Nurture</Heading>
                          <Badge variant="success">● Live</Badge>
                        </div>
                        <Paragraph size="p5" tone="tertiary" className="mt-1">
                          Sends 3-step email sequence when a lead reaches score
                          80+.
                        </Paragraph>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon-sm">
                      <Ellipsis className="size-3.5" />
                    </Button>
                  </div>
                  <Separator className="bg-[var(--line-subtle)]" />
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Paragraph
                        size="p6"
                        tone="quaternary"
                        className="uppercase tracking-[0.12em]"
                      >
                        Runs (7D)
                      </Paragraph>
                      <p className="mt-1 text-[20px] font-semibold tabular-nums">
                        1,284
                      </p>
                    </div>
                    <div>
                      <Paragraph
                        size="p6"
                        tone="quaternary"
                        className="uppercase tracking-[0.12em]"
                      >
                        Success
                      </Paragraph>
                      <p className="mt-1 text-[20px] font-semibold tabular-nums">
                        98.2%
                      </p>
                    </div>
                    <div>
                      <Paragraph
                        size="p6"
                        tone="quaternary"
                        className="uppercase tracking-[0.12em]"
                      >
                        Owner
                      </Paragraph>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Avatar className="size-5">
                          <AvatarFallback className="text-[9px]">
                            AS
                          </AvatarFallback>
                        </Avatar>
                        <Paragraph size="p4" tone="primary">
                          Ana
                        </Paragraph>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[var(--accent)] shadow-[var(--shadow-glow)]">
                <CardContent className="space-y-4 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[var(--accent)]">
                        <span className="ds-ai-pulse size-2 rounded-full bg-[var(--accent)]" />
                        <Paragraph
                          size="p4"
                          tone="primary"
                          className="font-mono text-[var(--accent)]"
                        >
                          Aurora is drafting
                        </Paragraph>
                      </div>
                      <Heading level="h5">Q4 launch landing page</Heading>
                      <Paragraph size="p5" tone="tertiary">
                        Block 4 of 7 — Pricing section
                      </Paragraph>
                    </div>
                    <Paragraph
                      size="p6"
                      tone="quaternary"
                      className="font-mono"
                    >
                      elapsed 9.8s
                    </Paragraph>
                  </div>
                  <Progress value={57} />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <X className="size-3.5" />
                        Cancel
                      </Button>
                      <Button variant="outline" size="sm">
                        Show steps
                      </Button>
                    </div>
                    <Paragraph size="p6" tone="quaternary">
                      Aurora-Pro · est. $0.32
                    </Paragraph>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  ic: "SM",
                  name: "Speed Milhas",
                  meta: "Travel · Reward management",
                  badge: { label: "Active", variant: "success" as const },
                  stats: [
                    ["Skills", "14"],
                    ["Members", "28"],
                  ],
                },
                {
                  ic: "AC",
                  name: "Acme Operations",
                  meta: "SaaS · DevTools",
                  badge: {
                    label: "Trial · 4d left",
                    variant: "warning" as const,
                  },
                  stats: [
                    ["Skills", "7"],
                    ["Members", "3"],
                  ],
                },
              ].map((entity) => (
                <Card key={entity.name}>
                  <CardContent className="space-y-4 pt-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <Avatar shape="square" className="size-9">
                          <AvatarFallback className="text-[12px]">
                            {entity.ic}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Heading level="h5">{entity.name}</Heading>
                          <Paragraph size="p5" tone="tertiary">
                            {entity.meta}
                          </Paragraph>
                        </div>
                      </div>
                      <Badge variant={entity.badge.variant}>
                        {entity.badge.label}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {entity.stats.map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] p-2.5"
                        >
                          <Paragraph
                            size="p6"
                            tone="quaternary"
                            className="uppercase tracking-[0.12em]"
                          >
                            {label}
                          </Paragraph>
                          <p className="mt-0.5 text-[18px] font-semibold tabular-nums">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card className="border-dashed border-[var(--line-strong)] bg-transparent">
                <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <div className="flex size-10 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] text-[var(--fg-tertiary)]">
                    +
                  </div>
                  <Heading level="h5">Add company</Heading>
                  <Paragraph size="p5" tone="tertiary" className="max-w-[24ch]">
                    Spin up a new AI-native workspace in under 60 seconds.
                  </Paragraph>
                </CardContent>
              </Card>
            </div>
          </DsSection>

          <DsSection
            id="forms"
            eyebrow="18 · Forms"
            title="Multi-step where it earns the friction."
            description="Settings and onboarding flows use stepper layouts with a left progress rail. Inline forms in dialogs use a single column, max 480px wide. Autosave fires 800ms after the last keystroke and shows a subtle status next to the page title."
          >
            <Card>
              <CardContent className="grid gap-6 pt-6 lg:grid-cols-[260px_1fr]">
                <div className="flex flex-col gap-2">
                  <Paragraph
                    size="p6"
                    tone="quaternary"
                    className="px-1 uppercase tracking-[0.14em]"
                  >
                    Onboard company
                  </Paragraph>
                  {[
                    {
                      label: "Company profile",
                      meta: "acme.com · detected",
                      state: "done" as const,
                    },
                    {
                      label: "Brand voice",
                      meta: "In progress",
                      state: "active" as const,
                    },
                    {
                      label: "Connect data",
                      meta: "3 sources optional",
                      state: "pending" as const,
                    },
                    {
                      label: "Invite team",
                      meta: "Optional",
                      state: "pending" as const,
                    },
                  ].map((step, index) => (
                    <div
                      key={step.label}
                      className={cn(
                        "flex items-center gap-3 rounded-[var(--r-md)] border p-3",
                        step.state === "active"
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--line-default)] bg-[var(--bg-base)]",
                      )}
                    >
                      {step.state === "done" ? (
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--success)_18%,transparent)] text-[var(--success)]">
                          <Check className="size-4" />
                        </span>
                      ) : step.state === "active" ? (
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--fg-on-accent)] text-[12px] font-semibold tabular-nums">
                          {index + 1}
                        </span>
                      ) : (
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--line-default)] bg-[var(--bg-sunken)] text-[var(--fg-tertiary)] text-[12px] font-medium tabular-nums">
                          {index + 1}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-[13px] font-medium",
                            step.state === "pending"
                              ? "text-[var(--fg-tertiary)]"
                              : "text-[var(--fg-primary)]",
                          )}
                        >
                          {step.label}
                        </p>
                        <p className="text-[11.5px] text-[var(--fg-tertiary)]">
                          {step.meta}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Form {...onboardingForm}>
                  <form
                    className="space-y-5"
                    onSubmit={onboardingForm.handleSubmit((values) =>
                      toast.success("Onboarding saved", {
                        description: `${values.workspaceName} · ${values.tone.join(" · ")}`,
                      }),
                    )}
                  >
                    <div className="space-y-2">
                      <Paragraph
                        size="p6"
                        tone="quaternary"
                        className="uppercase tracking-[0.14em]"
                      >
                        Step 2 of 4
                      </Paragraph>
                      <Heading level="h3">How does your company sound?</Heading>
                      <Paragraph size="p4" tone="tertiary">
                        Aurora will use this to write everything in your voice —
                        from social posts to support replies. You can edit any
                        of these later.
                      </Paragraph>
                    </div>
                    <FormField
                      control={onboardingForm.control}
                      name="workspaceName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Workspace name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            3–60 characters. Shown across the platform.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={onboardingForm.control}
                      name="tone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tone</FormLabel>
                          <FormControl>
                            <ToggleGroup
                              type="multiple"
                              className="flex flex-wrap justify-start gap-2"
                              value={field.value}
                              onValueChange={(value) =>
                                field.onChange(value.slice(0, 3))
                              }
                            >
                              {toneOptions.map((tone) => (
                                <ToggleGroupItem
                                  key={tone}
                                  value={tone}
                                  className="rounded-[var(--r-full)] border border-[var(--line-default)] px-3"
                                >
                                  {tone}
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                          </FormControl>
                          <FormDescription>Pick up to 3.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={onboardingForm.control}
                      name="voice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Voice sample (optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormDescription>
                            Aurora detected: confident · direct · short
                            sentences · no jargon
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Separator className="bg-[var(--line-subtle)]" />
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-[12px] text-[var(--fg-tertiary)]">
                        <span className="size-1.5 rounded-full bg-[var(--success)]" />
                        Autosaved · 2s ago
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm">
                          <ChevronRight className="size-3.5 rotate-180" />
                          Back
                        </Button>
                        <Button type="submit" size="sm">
                          Continue
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </DsSection>

          <DsSection
            id="empty"
            eyebrow="19 · Empty & Loading"
            title="An empty state is a teaching moment"
            description="The system explains what the area does, what to do next and how AI can accelerate the first step."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>No automations yet</CardTitle>
                  <CardDescription>
                    Automations run skills on a schedule or trigger. Start from
                    a template or describe what you want — Aurora will draft it.
                  </CardDescription>
                </CardHeader>
                <CardFooter className="gap-3">
                  <Button>
                    <WandSparkles data-icon="inline-start" />
                    Describe an automation
                  </Button>
                  <Button variant="outline">Browse templates</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Loading · table skeleton</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </div>
          </DsSection>

          <DsSection
            id="notifications"
            eyebrow="20 · Notifications"
            title="Three surfaces. Strict priority hierarchy."
            description="Toasts float, banners interrupt, inline notes stay attached to the thing they explain."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-3 rounded-[var(--r-xl)] border border-[var(--line-default)] bg-[var(--bg-base)] p-5">
                <Paragraph
                  size="p6"
                  tone="quaternary"
                  className="uppercase tracking-[0.14em]"
                >
                  Toasts
                </Paragraph>
                {[
                  {
                    tone: "success" as const,
                    icon: Check,
                    title: "Automation published",
                    desc: "Q4 Lead Nurture is live and accepting events.",
                  },
                  {
                    tone: "warning" as const,
                    icon: TriangleAlert,
                    title: "Approval requested",
                    desc: "3 LinkedIn drafts awaiting review · Aurora · 12s ago",
                  },
                  {
                    tone: "destructive" as const,
                    icon: X,
                    title: "Run failed",
                    desc: "Stripe auth expired.",
                    action: "Reconnect",
                  },
                  {
                    tone: "info" as const,
                    icon: Info,
                    title: "Context updated",
                    desc: "Aurora indexed 12 new pages of company brain.",
                  },
                ].map((t) => {
                  const Icon = t.icon;
                  const ringColor =
                    t.tone === "success"
                      ? "var(--success)"
                      : t.tone === "warning"
                        ? "var(--warning)"
                        : t.tone === "destructive"
                          ? "var(--danger)"
                          : "var(--info)";
                  return (
                    <div
                      key={t.title}
                      className="flex items-start gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-3 shadow-[var(--shadow-sm)]"
                    >
                      <span
                        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: `color-mix(in oklch, ${ringColor} 16%, transparent)`,
                          color: ringColor,
                        }}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                          {t.title}
                        </p>
                        <p className="text-[12.5px] text-[var(--fg-tertiary)]">
                          {t.desc}
                          {t.action ? (
                            <>
                              {" "}
                              <a
                                href="#notifications"
                                className="text-[var(--accent)] underline-offset-2 hover:underline"
                              >
                                {t.action}
                              </a>
                              .
                            </>
                          ) : null}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Dismiss"
                        className="text-[var(--fg-quaternary)] transition-colors hover:text-[var(--fg-primary)]"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      toast.success("Automation published", {
                        description:
                          "Q4 Lead Nurture is live and accepting events.",
                      })
                    }
                  >
                    Fire success
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast.warning("Approval requested", {
                        description:
                          "3 LinkedIn drafts awaiting review · Aurora · 12s ago",
                      })
                    }
                  >
                    Fire warning
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      toast.error("Run failed", {
                        description: "Stripe auth expired. Reconnect required.",
                      })
                    }
                  >
                    Fire error
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast.info("Context updated", {
                        description: "Aurora indexed 12 new pages.",
                      })
                    }
                  >
                    Fire info
                  </Button>
                </div>
              </div>

              <div className="space-y-3 rounded-[var(--r-xl)] border border-[var(--line-default)] bg-[var(--bg-base)] p-5">
                <Paragraph
                  size="p6"
                  tone="quaternary"
                  className="uppercase tracking-[0.14em]"
                >
                  Banners & inline
                </Paragraph>

                <div className="flex items-start gap-3 rounded-[var(--r-md)] border border-[color-mix(in_oklch,var(--accent)_45%,transparent)] bg-[color-mix(in_oklch,var(--accent)_10%,transparent)] p-3">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
                  <p className="flex-1 text-[13px] leading-5 text-[var(--fg-primary)]">
                    <strong className="font-semibold">Aurora suggests</strong>{" "}
                    pausing the{" "}
                    <strong className="font-semibold">Q4 Drip</strong> campaign
                    — open rate dropped 38% in 6 hours.
                  </p>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>

                <div className="flex items-start gap-3 rounded-[var(--r-md)] border border-[color-mix(in_oklch,var(--warning)_45%,transparent)] bg-[color-mix(in_oklch,var(--warning)_10%,transparent)] p-3">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" />
                  <p className="flex-1 text-[13px] leading-5 text-[var(--fg-primary)]">
                    Token budget at 82% · projected to exhaust on day 24.
                  </p>
                  <Button variant="outline" size="sm">
                    Increase
                  </Button>
                </div>

                <div className="flex items-start gap-3 rounded-[var(--r-md)] border border-[color-mix(in_oklch,var(--danger)_45%,transparent)] bg-[color-mix(in_oklch,var(--danger)_10%,transparent)] p-3">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" />
                  <p className="flex-1 text-[13px] leading-5 text-[var(--fg-primary)]">
                    <strong className="font-semibold">Integration down</strong>{" "}
                    · Stripe API auth expired 14 minutes ago.
                  </p>
                  <Button variant="destructive" size="sm">
                    Reconnect
                  </Button>
                </div>

                <div className="flex items-start gap-3 rounded-r-[var(--r-md)] border-l-[3px] border-[var(--info)] bg-[var(--bg-raised)] p-3">
                  <Info className="mt-0.5 size-4 shrink-0 text-[var(--info)]" />
                  <div>
                    <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                      Inline note
                    </p>
                    <p className="text-[12.5px] text-[var(--fg-tertiary)]">
                      For info that lives next to the thing it describes, not
                      floating on top of it.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DsSection>

          <DsSection
            id="ai"
            eyebrow="21 · AI-native patterns"
            title="The interface stays honest about what the AI is doing"
            description="Progress, approvals, confidence and token usage all stay visible. AI feels accountable, not mystical."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Aurora is drafting</CardTitle>
                  <CardDescription>elapsed 9.8s · est. $0.32</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="ds-ai-pulse size-2 rounded-full bg-[var(--accent)]" />
                    Block 4 of 7 — Pricing section
                  </div>
                  <Button variant="ghost" size="sm">
                    Show steps
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Approval requested</CardTitle>
                  <CardDescription>
                    3 LinkedIn drafts awaiting review
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-[var(--fg-secondary)]">
                  <div className="flex items-center justify-between">
                    <span>Cost</span>
                    <span className="tabular-nums">$0.0238</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tokens</span>
                    <span className="tabular-nums">1,984</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Latency</span>
                    <span className="tabular-nums">12.4s</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>AI done</CardTitle>
                  <CardDescription>
                    One allowed flourish on success.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                  <div className="ds-check-pop flex size-10 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--success)_16%,transparent)] text-[var(--success)]">
                    <Check className="size-5" />
                  </div>
                  <div className="text-sm text-[var(--fg-secondary)]">
                    Checkmark scales 0.8 → 1 with spring timing.
                  </div>
                </CardContent>
              </Card>
            </div>
          </DsSection>

          <DsSection
            id="composition"
            eyebrow="22 · Composition"
            title="The system, assembled"
            description="When the tokens and components are composed together, the product should feel exact, stable and already in production."
          >
            <Tabs defaultValue="overview" className="space-y-5">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="workspace">Workspace</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle>Approval queue · 12</CardTitle>
                      <CardDescription>
                        Recent executions synced 14 seconds ago
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert variant="success">
                        <Check className="size-4" />
                        <AlertTitle>Automation published</AlertTitle>
                        <AlertDescription>
                          Q4 Lead Nurture is live and accepting events.
                        </AlertDescription>
                      </Alert>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Run</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Owner</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium text-[var(--fg-primary)]">
                              Q4 campaign brief
                            </TableCell>
                            <TableCell>
                              <Badge variant="warning">Awaiting approval</Badge>
                            </TableCell>
                            <TableCell>Ana</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium text-[var(--fg-primary)]">
                              Monthly report
                            </TableCell>
                            <TableCell>
                              <Badge variant="success">Completed</Badge>
                            </TableCell>
                            <TableCell>Luis</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Execution controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <DsField label="Publish mode">
                        <RadioGroup
                          value={publishMode}
                          onValueChange={setPublishMode}
                          className="gap-3"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <RadioGroupItem
                              id="publish-direct"
                              value="direct"
                            />
                            <label htmlFor="publish-direct">Direct</label>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <RadioGroupItem
                              id="publish-approval"
                              value="approval"
                            />
                            <label htmlFor="publish-approval">
                              Require approval
                            </label>
                          </div>
                        </RadioGroup>
                      </DsField>
                      <div className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3 text-sm">
                        <span>Notify team</span>
                        <Switch defaultChecked />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="workspace">
                <Card>
                  <CardHeader>
                    <CardTitle>Workspace overview</CardTitle>
                    <CardDescription>
                      AIBusiness OS — Design System v0.1 · tokens · components ·
                      patterns
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-[var(--bg-base)]">
                      <CardContent className="pt-5">
                        <p className="text-sm text-[var(--fg-secondary)]">
                          Landing pages
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-[var(--bg-base)]">
                      <CardContent className="pt-5">
                        <p className="text-sm text-[var(--fg-secondary)]">
                          Social drafts · 12
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-[var(--bg-base)]">
                      <CardContent className="pt-5">
                        <p className="text-sm text-[var(--fg-secondary)]">
                          Approvals
                        </p>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>System preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <DsField label="Notifications">
                      <Select defaultValue="daily">
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily digest</SelectItem>
                          <SelectItem value="live">Live alerts</SelectItem>
                        </SelectContent>
                      </Select>
                    </DsField>
                    <div className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3 text-sm">
                      <span>Compact density</span>
                      <Switch defaultChecked />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DsSection>

          <DsSection
            id="extras"
            eyebrow="23 · Operational extras"
            title="Primitives the system depends on"
            description="Disclosure, navigation by location and step, time, OTP, range, hover detail and operational charts. Every primitive composes with the same tokens."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Breadcrumb · Pagination</CardTitle>
                  <CardDescription>
                    Location in the product and stepping through long lists.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="#extras">
                          Workspace
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="#extras">
                          Automations
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Q4 Lead Nurture</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>

                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious href="#extras" />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink href="#extras">1</PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink href="#extras" isActive>
                          2
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink href="#extras">3</PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink href="#extras">52</PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext href="#extras" />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Accordion · Collapsible</CardTitle>
                  <CardDescription>
                    Disclosure patterns for dense, optional content.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Accordion type="single" collapsible defaultValue="item-1">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>
                        What does Aurora track per run?
                      </AccordionTrigger>
                      <AccordionContent>
                        Latency, cost, tokens, input/output hash and the model
                        used. Surfaces them in the run drawer.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>
                        How are approvals routed?
                      </AccordionTrigger>
                      <AccordionContent>
                        By workflow policy. Approvers see the queue with cost
                        preview before publishing.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <Collapsible
                    defaultOpen
                    className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3"
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between"
                      >
                        Advanced run options
                        <ChevronRight className="size-3.5 transition-transform [&[data-state=open]]:rotate-90" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 grid gap-2 text-[12.5px] text-[var(--fg-tertiary)]">
                      <span>Retry budget · 3</span>
                      <span>Concurrency · 4</span>
                      <span>Timeout · 90s</span>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Calendar · OTP · Slider</CardTitle>
                  <CardDescription>
                    Time, verification and bounded numeric controls.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 md:grid-cols-[auto_1fr]">
                  <Calendar
                    mode="single"
                    selected={calendarDate}
                    onSelect={setCalendarDate}
                    className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]"
                  />
                  <div className="space-y-5">
                    <DsField
                      label="Verification code"
                      helper="6-digit code sent to ana@acme.com"
                    >
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </DsField>
                    <DsField
                      label="Budget cap"
                      helper={`Pause workflows when daily spend reaches $${budgetCap}.`}
                    >
                      <Slider
                        value={[budgetCap]}
                        onValueChange={([value]) => setBudgetCap(value ?? 0)}
                        max={500}
                        step={1}
                      />
                    </DsField>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>HoverCard · ScrollArea · Kbd</CardTitle>
                  <CardDescription>
                    Quick context, scrollable lists, keyboard hints.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-3 text-[13px] text-[var(--fg-secondary)]">
                    Press
                    <Kbd>⌘</Kbd>
                    <Kbd>K</Kbd>
                    to open the command menu.
                  </div>

                  <HoverCard openDelay={120}>
                    <HoverCardTrigger asChild>
                      <Button variant="outline" size="sm">
                        @aurora
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Aurora-Pro</p>
                        <p className="text-[12.5px] text-[var(--fg-tertiary)]">
                          Best-effort reasoning model. 1,984 tokens · $0.0238 ·
                          12.4s avg.
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>

                  <ScrollArea className="h-40 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] p-3 text-[12.5px] text-[var(--fg-secondary)]">
                    {Array.from({ length: 24 }).map((_, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between border-b border-[var(--line-subtle)] py-1.5 last:border-b-0"
                      >
                        <span className="font-mono tabular-nums">
                          run_{(7000 + index).toString(16)}
                        </span>
                        <span>14:0{index % 10}:33Z</span>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>Data table · sortable, paginated</CardTitle>
                  <CardDescription>
                    Built on TanStack Table. Headers sort on click, pagination
                    is automatic.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable columns={runColumns} data={runRows} pageSize={4} />
                </CardContent>
              </Card>

              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>Chart · runs vs cost · 7d</CardTitle>
                  <CardDescription>
                    Built on recharts using the chart token ramp.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-64 w-full">
                    <AreaChart
                      data={chartData}
                      margin={{ left: 0, right: 12, top: 12, bottom: 0 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="var(--line-subtle)"
                      />
                      <XAxis
                        dataKey="day"
                        stroke="var(--fg-quaternary)"
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <defs>
                        <linearGradient
                          id="ds-runs"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="var(--color-runs)"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--color-runs)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="ds-cost"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="var(--color-cost)"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--color-cost)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="runs"
                        stroke="var(--color-runs)"
                        strokeWidth={2}
                        fill="url(#ds-runs)"
                      />
                      <Area
                        type="monotone"
                        dataKey="cost"
                        stroke="var(--color-cost)"
                        strokeWidth={2}
                        fill="url(#ds-cost)"
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </DsSection>
        </main>
      </div>
    </div>
  );
}
