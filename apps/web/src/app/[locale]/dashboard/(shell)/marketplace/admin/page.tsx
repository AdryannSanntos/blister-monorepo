"use client";

import { Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { MarketplaceAdminPage } from "src/core/modules/marketplace/pages/marketplace-admin-page";
import { PermissionGate } from "src/core/shared/components/permission-gate";
import { Button } from "src/core/shared/components/ui/button";
import { EmptyState } from "src/core/shared/components/ui/empty-state";
import { Link } from "@/i18n/routing";

export default function Page() {
  const t = useTranslations("marketplaceAdmin");

  return (
    <PermissionGate
      permission="marketplace.manage"
      fallback={
        <EmptyState
          icon={Store}
          title={t("accessDeniedTitle")}
          description={t("accessDeniedDescription")}
          action={
            <Button variant="outline" asChild>
              <Link href="/dashboard/marketplace">{t("backToMarketplace")}</Link>
            </Button>
          }
        />
      }
    >
      <MarketplaceAdminPage />
    </PermissionGate>
  );
}
