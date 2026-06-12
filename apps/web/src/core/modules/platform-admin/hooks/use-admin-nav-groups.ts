"use client";

import { Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { type SidebarGroupDef } from "src/core/shared/components/ui/app-sidebar";

export function useAdminNavGroups(): SidebarGroupDef[] {
  const t = useTranslations("sidebar");

  return useMemo(
    () => [
      {
        items: [
          {
            label: t("admin"),
            href: "/admin",
            icon: Shield,
            match: (pathname: string) => pathname.startsWith("/admin"),
          },
        ],
      },
    ],
    [t],
  );
}
