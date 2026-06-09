"use client";

import { Headphones, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";

import { usePlatformAdmins } from "../hooks/use-platform-admin";
import { usePlatformAdminTab } from "../hooks/use-platform-admin-tab";

export function PlatformAdminOverviewPanel() {
  const [, setTab] = usePlatformAdminTab();
  const admins = usePlatformAdmins();
  const adminAssignments = admins.data ?? [];
  const t = useTranslations("platformAdmin");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="bg-[var(--bg-base)]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-[var(--fg-secondary)]" />
            <CardTitle className="text-[16px]">{t("adminsCard.title")}</CardTitle>
          </div>
          <CardDescription>
            {t("adminsCard.description", { count: adminAssignments.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => setTab("admins")}>
            {t("adminsCard.manage")}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-[var(--bg-base)]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Headphones className="size-4 text-[var(--fg-secondary)]" />
            <CardTitle className="text-[16px]">{t("supportCard.title")}</CardTitle>
          </div>
          <CardDescription>{t("supportCard.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => setTab("support")}>
            {t("supportCard.view")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
