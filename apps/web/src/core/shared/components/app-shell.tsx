"use client";

import {
  Building2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { CreditBadge } from "src/core/modules/credits/components/credit-badge";
import { UserTrigger } from "src/core/modules/dashboard/components/sidebar-triggers";
import {
  getInitials,
  useDashboardData,
} from "src/core/modules/dashboard/hooks/use-dashboard-data";
import { usePlatformRoleAccess } from "src/core/modules/platform-admin/hooks/use-platform-admin";
import { BrandIcon } from "src/core/shared/components/brand-icon";
import { BrandLogo } from "src/core/shared/components/brand-logo";
import { PageTransition } from "src/core/shared/components/page-transition";
import {
  AppSidebar,
  type SidebarGroupDef,
} from "src/core/shared/components/ui/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "src/core/shared/components/ui/breadcrumb";
import { Button } from "src/core/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
import { authClient } from "src/core/shared/utils/auth-client";
import { queryClient } from "src/core/shared/utils/query-client";

import { Link, useRouter } from "@/i18n/routing";

export type AppShellBreadcrumb = {
  homeLabel: string;
  homeHref: string;
  currentPageTitle: string | null;
};

type AppShellProps = {
  children: ReactNode;
  contentId: string;
  navGroups: SidebarGroupDef[];
  breadcrumb: AppShellBreadcrumb;
  headerEnd?: ReactNode;
};

export function AppShell({
  children,
  contentId,
  navGroups,
  breadcrumb,
  headerEnd,
}: AppShellProps) {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const { canAccessPlatformAdmin } = usePlatformRoleAccess();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("blister:sidebar-open");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const { displayName, sessionUser, isLoading } = useDashboardData();
  const userInitials = getInitials(displayName);
  const userEmail = sessionUser?.email ?? "";

  async function handleSignOut() {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error(error.message ?? t("signOutError"));
      return;
    }
    queryClient.clear();
    router.push("/auth/login");
    router.refresh();
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-svh overflow-hidden bg-[var(--bg-base)] text-[var(--fg-primary)]">
      <AppSidebar
        defaultOpen
        open={sidebarOpen}
        onOpenChange={(next) => {
          setSidebarOpen(next);
          try {
            localStorage.setItem("blister:sidebar-open", JSON.stringify(next));
          } catch {}
        }}
        fullHeight
        className="shrink-0"
        groups={navGroups}
        workspaceTrigger={(collapsed) =>
          collapsed ? (
            <div className="flex h-full items-center justify-center">
              <BrandIcon className="h-9 w-auto" />
            </div>
          ) : (
            <div className="flex h-full w-full items-center pl-4">
              <BrandLogo className="h-10 w-auto" />
            </div>
          )
        }
        user={{
          name: displayName,
          email: "",
          role: "member",
          initials: userInitials,
        }}
        userTrigger={(collapsed) => (
          <UserTrigger
            collapsed={collapsed}
            displayName={displayName}
            email={userEmail}
            userInitials={userInitials}
          />
        )}
      />

      <div
        id={contentId}
        className="min-w-0 flex-1 overflow-y-auto bg-[var(--bg-base)] pt-3"
      >
        <header className="sticky top-0 z-20 mx-3 flex h-14 shrink-0 items-center justify-between gap-4 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-canvas)] px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                sidebarOpen ? t("collapseSidebar") : t("expandSidebar")
              }
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
            </Button>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  {breadcrumb.currentPageTitle ? (
                    <BreadcrumbLink asChild>
                      <Link href={breadcrumb.homeHref}>
                        {breadcrumb.homeLabel}
                      </Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{breadcrumb.homeLabel}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {breadcrumb.currentPageTitle && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {breadcrumb.currentPageTitle}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center">
            {headerEnd}
            <CreditBadge />
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("accountSettings")}
              asChild
            >
              <Link href="/dashboard/account/settings">
                <Settings className="size-4" />
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("userMenu")}
                  className="text-[var(--error-600)] hover:text-[var(--error-700)]"
                >
                  <LogOut className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link href="/workspaces">
                    <Building2 className="size-4" />
                    {t("viewCompanies")}
                  </Link>
                </DropdownMenuItem>
                {canAccessPlatformAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link href="/workspaces/admin">
                      <Shield className="size-4" />
                      {t("platformAdminArea")}
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/account/settings">
                    <User className="size-4" />
                    {t("accountSettings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
                  <LogOut className="size-4" />
                  {t("signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <PageTransition className="px-6 pt-3 pb-6">{children}</PageTransition>
      </div>
    </div>
  );
}
