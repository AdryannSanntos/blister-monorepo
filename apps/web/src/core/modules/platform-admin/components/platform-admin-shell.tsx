"use client";

import { Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "src/core/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import { EmptyState } from "src/core/shared/components/ui/empty-state";
import { cn } from "src/core/shared/utils";
import { PLATFORM_ADMIN_NAV_ITEMS } from "./platform-admin-primitives";
import { usePlatformRoleAccess } from "../hooks/use-platform-admin";

export function PlatformAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { canAccessPlatformAdmin, isLoading, roles } = usePlatformRoleAccess();

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <div className="h-[168px] animate-pulse rounded-[var(--r-xl)] border border-[var(--line-default)] bg-[var(--bg-base)]" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            "admin-shell-skeleton-1",
            "admin-shell-skeleton-2",
            "admin-shell-skeleton-3",
            "admin-shell-skeleton-4",
          ].map((key) => (
            <div
              key={key}
              className="h-[112px] animate-pulse rounded-[var(--r-xl)] border border-[var(--line-default)] bg-[var(--bg-base)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!canAccessPlatformAdmin) {
    return (
      <EmptyState
        icon={Shield}
        title="Acesso restrito"
        description="A área de plataforma é reservada para platform_owner e platform_admin."
        compact
        className="mx-auto max-w-2xl py-24"
      />
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="bg-[var(--bg-base)]">
        <CardHeader className="gap-4 border-b border-[var(--line-subtle)] pb-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Conta</Badge>
                {roles.map((role) => (
                  <Badge key={role} variant="outline">
                    {role}
                  </Badge>
                ))}
              </div>
              <CardTitle className="mt-3 text-[28px] tracking-[-0.03em]">
                Admin de plataforma
              </CardTitle>
              <p className="mt-2 max-w-[760px] text-[14px] leading-[1.6] text-[var(--fg-tertiary)]">
                Central unica para governar acessos globais, catalogo de IA,
                restricoes por empresa, execucoes e custos tecnicos do Workana
                AI fora do contexto de uma company especifica.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-5 md:grid-cols-2 xl:grid-cols-4">
          {PLATFORM_ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/workspaces/admin"
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-[var(--r-lg)] border px-4 py-4 transition-colors duration-[var(--dur-fast)]",
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--line-default)] bg-[var(--bg-raised)] hover:border-[var(--line-strong)] hover:bg-[var(--bg-hover)]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[12px] leading-[1.55] text-[var(--fg-tertiary)]">
                      {item.description}
                    </p>
                  </div>
                  <div className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-2">
                    <Icon className="size-4 text-[var(--fg-secondary)]" />
                  </div>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <div>{children}</div>
    </div>
  );
}
