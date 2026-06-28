"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "src/core/shared/components/ui/button";

import { AdminRoleDialog } from "../components/admin-role-dialog";
import { AgentsPlatformTab } from "../components/agents-platform-tab";
import { AiCatalogTab } from "../components/ai-catalog-tab";
import { CompaniesAdminTab } from "../components/companies-admin-tab";
import { CreditsPlatformTab } from "../components/credits-platform-tab";
import { PlatformAdminOverviewPanel } from "../components/platform-admin-overview-panel";
import { PlatformAdminPageLayout } from "../components/platform-admin-page-layout";
import { PlatformAdminsPanel } from "../components/platform-admins-panel";
import { PlatformSupportPanel } from "../components/platform-support-panel";
import { SystemAiTab } from "../components/system-ai-tab";
import { usePlatformAdminTab } from "../hooks/use-platform-admin-tab";

export function PlatformAdminPage() {
  const [tab] = usePlatformAdminTab();
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const tAdmins = useTranslations("platformAdmin.adminsPage");

  const actions =
    tab === "admins" ? (
      <Button onClick={() => setAdminDialogOpen(true)}>
        <Plus className="size-4" />
        {tAdmins("grantAccess")}
      </Button>
    ) : undefined;

  return (
    <>
      <PlatformAdminPageLayout actions={actions}>
        {tab === "overview" && <PlatformAdminOverviewPanel />}
        {tab === "admins" && (
          <PlatformAdminsPanel onGrantAccess={() => setAdminDialogOpen(true)} />
        )}
        {tab === "support" && <PlatformSupportPanel />}
        {tab === "agents" && <AgentsPlatformTab />}
        {tab === "ai-catalog" && <AiCatalogTab />}
        {tab === "system-ai" && <SystemAiTab />}
        {tab === "credits" && <CreditsPlatformTab />}
        {tab === "companies" && <CompaniesAdminTab />}
      </PlatformAdminPageLayout>

      <AdminRoleDialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen} />
    </>
  );
}
