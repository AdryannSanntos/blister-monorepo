"use client";

import { Building2, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useMemo } from "react";
import { usePlatformRoleAccess } from "src/core/modules/platform-admin/hooks/use-platform-admin";
import { AppShell } from "src/core/shared/components/app-shell";
import { type SidebarGroupDef } from "src/core/shared/components/ui/app-sidebar";

import { usePathname } from "@/i18n/routing";

type WorkspacesShellProps = {
  children: ReactNode;
};

export function WorkspacesShell({ children }: WorkspacesShellProps) {
  const pathname = usePathname();
  const t = useTranslations("workspacesHub");
  const { canAccessPlatformAdmin } = usePlatformRoleAccess();

  const currentPageTitle = useMemo(() => {
    if (pathname === "/workspaces") return null;
    if (pathname.startsWith("/workspaces/admin")) return t("admin");
    return null;
  }, [pathname, t]);

  const navGroups: SidebarGroupDef[] = useMemo(
    () => [
      {
        items: [
          {
            label: t("companies"),
            href: "/workspaces",
            icon: Building2,
            match: (p: string) => p === "/workspaces",
          },
          ...(canAccessPlatformAdmin
            ? [
                {
                  label: t("admin"),
                  href: "/workspaces/admin",
                  icon: Shield,
                  match: (p: string) => p.startsWith("/workspaces/admin"),
                },
              ]
            : []),
        ],
      },
    ],
    [canAccessPlatformAdmin, t],
  );

  return (
    <AppShell
      contentId="workspaces-content"
      navGroups={navGroups}
      breadcrumb={{
        homeLabel: t("companies"),
        homeHref: "/workspaces",
        currentPageTitle,
      }}
    >
      {children}
    </AppShell>
  );
}
