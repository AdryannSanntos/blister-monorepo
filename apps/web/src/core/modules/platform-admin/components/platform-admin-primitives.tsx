import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Bot,
  ChartColumn,
  LayoutTemplate,
  Shield,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Badge } from "src/core/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";

export type PlatformAdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export const PLATFORM_ADMIN_NAV_ITEMS: PlatformAdminNavItem[] = [
  {
    label: "Visao geral",
    href: "/workspaces/admin",
    icon: ChartColumn,
    description: "Panorama operacional da camada global de IA.",
  },
  {
    label: "Admins",
    href: "/workspaces/admin/admins",
    icon: Shield,
    description: "Acessos globais de plataforma e governanca.",
  },
  {
    label: "Providers",
    href: "/workspaces/admin/providers",
    icon: Sparkles,
    description: "Catalogo de vendors e gateways suportados.",
  },
  {
    label: "Models",
    href: "/workspaces/admin/models",
    icon: Bot,
    description: "Modelos habilitados para runtime e custos.",
  },
  {
    label: "Policies",
    href: "/workspaces/admin/policies",
    icon: BadgeCheck,
    description: "Restricoes por empresa, provider e modelos.",
  },
  {
    label: "Templates",
    href: "/workspaces/admin/templates",
    icon: LayoutTemplate,
    description: "Estrutura do catalogo global de agentes base.",
  },
  {
    label: "Runs",
    href: "/workspaces/admin/runs",
    icon: Workflow,
    description: "Observabilidade das execucoes da plataforma.",
  },
  {
    label: "Costs",
    href: "/workspaces/admin/costs",
    icon: ChartColumn,
    description: "Custos tecnicos agregados por provider e modelo.",
  },
];

export function formatPlatformDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatPlatformMoney(value?: number | null, currency = "USD") {
  const amount = value ?? 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(amount);
}

export function platformStatusVariant(status?: string | null) {
  switch (status) {
    case "active":
    case "success":
    case "accepted":
      return "success" as const;
    case "running":
    case "queued":
    case "pending":
    case "draft":
      return "warning" as const;
    case "disabled":
    case "deprecated":
    case "error":
    case "failed":
    case "cancelled":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export function PlatformAdminStatusBadge({
  status,
}: {
  status?: string | null;
}) {
  return <Badge variant={platformStatusVariant(status)}>{status ?? "-"}</Badge>;
}

export function PlatformAdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="bg-[var(--bg-base)]">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div>
          <CardDescription className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
            {label}
          </CardDescription>
          <CardTitle className="mt-2 text-[24px] tracking-[-0.03em]">
            {value}
          </CardTitle>
        </div>
        <div className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] p-2">
          <Icon className="size-4 text-[var(--fg-secondary)]" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-[12px] text-[var(--fg-tertiary)]">
        {hint}
      </CardContent>
    </Card>
  );
}
