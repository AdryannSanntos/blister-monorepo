"use client";

import { Building2, ChevronsUpDown, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useWorkspaceContext } from "src/core/modules/workspaces/hooks/use-workspace-context";
import { Button } from "src/core/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
import { SurfaceIcon } from "src/core/shared/components/ui/surface-icon";
import {
  getActiveWorkspaceId,
  setActiveWorkspaceId,
} from "src/core/shared/utils/active-workspace";
import { queryClient } from "src/core/shared/utils/query-client";
import { cn } from "src/core/shared/utils";

type WorkspaceSwitcherProps = {
  collapsed?: boolean;
};

export function WorkspaceSwitcher({ collapsed = false }: WorkspaceSwitcherProps) {
  const t = useTranslations("workspaceSwitcher");
  const router = useRouter();
  const { data, isLoading } = useWorkspaceContext();

  const activeId = getActiveWorkspaceId();

  const activeName =
    data?.companies.find((c) => c.id === activeId)?.name ?? t("selectWorkspace");

  const handleSelectCompany = (companyId: string) => {
    const company = data?.companies.find((item) => item.id === companyId);
    setActiveWorkspaceId(companyId);
    queryClient.invalidateQueries();
    router.push(company?.onboardingCompletedAt ? "/dashboard" : "/onboarding");
    router.refresh();
  };

  const handleCreateCompany = () => {
    router.push("/onboarding?new=1");
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-canvas)] p-2.5",
          collapsed && "justify-center border-0 bg-transparent p-0",
        )}
      >
        <div className="size-10 shrink-0 animate-pulse rounded-[var(--r-md)] bg-[var(--bg-sunken)]" />
        {!collapsed ? (
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="h-3 w-24 animate-pulse rounded bg-[var(--bg-sunken)]" />
            <div className="h-2.5 w-16 animate-pulse rounded bg-[var(--bg-sunken)]" />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto w-full justify-start gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-canvas)] p-2.5 text-left font-normal hover:bg-[var(--bg-hover)]",
            collapsed && "w-auto justify-center border-0 bg-transparent p-0 hover:bg-transparent",
          )}
          aria-label={t("switchWorkspace")}
        >
          <SurfaceIcon
            icon={Building2}
            className="size-10"
            iconClassName="size-5"
          />
          {!collapsed ? (
            <>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                  {activeName}
                </span>
                <span className="truncate text-[11.5px] text-[var(--fg-tertiary)]">
                  {t("companyType")}
                </span>
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-[var(--fg-quaternary)]" />
            </>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-64">
        <DropdownMenuLabel>{t("workspaces")}</DropdownMenuLabel>
        {data?.companies.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => handleSelectCompany(company.id)}
            className={cn(activeId === company.id && "bg-[var(--bg-muted)]")}
          >
            <Building2 className="size-4" />
            {company.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCreateCompany}>
          <Plus className="size-4" />
          {t("createCompany")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
