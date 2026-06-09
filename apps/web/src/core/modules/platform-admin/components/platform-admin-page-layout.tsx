"use client";

import { Shield } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { PageLayout } from "src/core/shared/components/ui/page-layout";

import { usePlatformAdminNavItems } from "./platform-admin-primitives";
import { PlatformAdminTabs } from "./platform-admin-tabs";
import { usePlatformAdminTab } from "../hooks/use-platform-admin-tab";

type PlatformAdminPageLayoutProps = Omit<
  ComponentProps<typeof PageLayout>,
  "afterHeader" | "icon" | "title" | "description"
> & {
  actions?: ReactNode;
};

export function PlatformAdminPageLayout({
  children,
  actions,
  ...props
}: PlatformAdminPageLayoutProps) {
  const [tab] = usePlatformAdminTab();
  const navItems = usePlatformAdminNavItems();
  const t = useTranslations("platformAdmin");
  const activeItem = navItems.find((item) => item.value === tab);
  const icon = activeItem?.icon ?? Shield;

  return (
    <PageLayout
      {...props}
      title={t(activeItem?.titleKey ?? "title")}
      description={t(activeItem?.descriptionKey ?? "description")}
      icon={icon}
      actions={actions}
      afterHeader={<PlatformAdminTabs />}
    >
      {children}
    </PageLayout>
  );
}
