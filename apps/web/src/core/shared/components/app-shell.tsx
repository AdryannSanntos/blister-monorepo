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
import { type ReactNode, Fragment, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CreditBadge } from "src/core/modules/credits/components/credit-badge";
import { UserTrigger } from "src/core/modules/dashboard/components/sidebar-triggers";
import {
  getInitials,
  useDashboardData,
} from "src/core/modules/dashboard/hooks/use-dashboard-data";
import { usePlatformRoleAccess } from "src/core/modules/platform-admin/hooks/use-platform-admin";
import { useWorkspaceContext } from "src/core/modules/workspaces/hooks/use-workspace-context";
import { WorkspaceSwitcher } from "src/core/modules/workspaces/components/workspace-switcher";
import { PageTransition } from "src/core/shared/components/page-transition";
import { useIsMobile } from "src/core/shared/hooks/use-mobile";
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
import {
  setPersonalWorkspace,
} from "src/core/shared/utils/active-workspace";

export type AppShellBreadcrumbItem = {
  label: string;
  href?: string;
};

export type AppShellBreadcrumb = {
  homeLabel: string;
  homeHref: string;
  /** Single-segment pages. Ignored when `items` is set. */
  currentPageTitle?: string | null;
  /** Segments after home. The last item is the current page. */
  items?: AppShellBreadcrumbItem[];
};

type AppShellProps = {
  children: ReactNode;
  contentId: string;
  navGroups: SidebarGroupDef[];
  breadcrumb: AppShellBreadcrumb;
  headerEnd?: ReactNode;
  /**
   * When this key becomes truthy (or changes to a different value) the sidebar
   * auto-collapses so the surface gets full focus — used for agent pages. The
   * collapse is contextual and intentionally does NOT overwrite the user's
   * persisted sidebar preference; they can reopen it manually at any time.
   */
  focusCollapseKey?: string | null;
};

export function AppShell({
  children,
  contentId,
  navGroups,
  breadcrumb,
  headerEnd,
  focusCollapseKey = null,
}: AppShellProps) {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const { canAccessPlatformAdmin, isLoading: isPlatformRoleLoading } =
    usePlatformRoleAccess();
  const { data: workspaceContext, isLoading: isWorkspaceLoading } =
    useWorkspaceContext();

  const isPersonalActive = workspaceContext?.active.type === "personal";
  const hasCompanies = (workspaceContext?.companies.length ?? 0) > 0;
  const showPersonalSpace = !isWorkspaceLoading && !isPersonalActive;
  const showCreateCompany = !isWorkspaceLoading && !hasCompanies;
  const showPlatformAdmin =
    !isPlatformRoleLoading && canAccessPlatformAdmin;
  const showWorkspaceActions =
    showPersonalSpace || showCreateCompany || showPlatformAdmin;
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      if (window.innerWidth < 768) return false;
      const saved = localStorage.getItem("blister:sidebar-open");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Auto-collapse the sidebar whenever the user enters (or switches between)
  // a focus surface such as an agent page. Starts at null so a direct load /
  // deep link onto an agent page also collapses on first paint.
  const prevFocusCollapseKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      focusCollapseKey &&
      focusCollapseKey !== prevFocusCollapseKeyRef.current
    ) {
      setSidebarOpen(false);
    }
    prevFocusCollapseKeyRef.current = focusCollapseKey;
  }, [focusCollapseKey]);

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
          if (!isMobile) {
            try {
              localStorage.setItem(
                "blister:sidebar-open",
                JSON.stringify(next),
              );
            } catch {}
          }
        }}
        fullHeight
        className="shrink-0"
        groups={navGroups}
        workspaceTrigger={(collapsed) => (
          <WorkspaceSwitcher collapsed={collapsed} />
        )}
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
        className="min-w-0 flex-1 overflow-y-auto bg-[var(--bg-base)] pt-1.5 md:pt-3"
      >
        <header className="sticky top-0 z-20 mx-2 flex h-12 shrink-0 items-center justify-between gap-2 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-canvas)] px-2.5 sm:mx-3 sm:h-14 sm:gap-3 sm:px-4 md:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 sm:size-9"
              aria-label={
                sidebarOpen ? t("collapseSidebar") : t("expandSidebar")
              }
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
            </Button>
            <Breadcrumb className="min-w-0">
              <BreadcrumbList className="flex-nowrap">
                {(() => {
                  const trailItems =
                    breadcrumb.items ??
                    (breadcrumb.currentPageTitle
                      ? [{ label: breadcrumb.currentPageTitle }]
                      : []);
                  const hasTrail = trailItems.length > 0;

                  return (
                    <>
                      <BreadcrumbItem className="min-w-0">
                        {hasTrail ? (
                          <BreadcrumbLink asChild>
                            <Link
                              href={breadcrumb.homeHref}
                              className="max-w-[5.5rem] truncate sm:max-w-none"
                            >
                              {breadcrumb.homeLabel}
                            </Link>
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="max-w-[8rem] truncate sm:max-w-none">
                            {breadcrumb.homeLabel}
                          </BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {trailItems.map((item, index) => {
                        const isLast = index === trailItems.length - 1;

                        return (
                          <Fragment key={`${item.label}-${index}`}>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem className="min-w-0">
                              {isLast || !item.href ? (
                                <BreadcrumbPage className="max-w-[7rem] truncate sm:max-w-none">
                                  {item.label}
                                </BreadcrumbPage>
                              ) : (
                                <BreadcrumbLink asChild>
                                  <Link
                                    href={item.href}
                                    className="max-w-[7rem] truncate sm:max-w-none"
                                  >
                                    {item.label}
                                  </Link>
                                </BreadcrumbLink>
                              )}
                            </BreadcrumbItem>
                          </Fragment>
                        );
                      })}
                    </>
                  );
                })()}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            {headerEnd}
            <CreditBadge compact />
            <Button
              variant="ghost"
              size="icon"
              className="hidden size-8 sm:inline-flex sm:size-9"
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
                  className="size-8 text-[var(--error-600)] hover:text-[var(--error-700)] sm:size-9"
                  aria-label={t("userMenu")}
                >
                  <LogOut className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {showPersonalSpace ? (
                  <DropdownMenuItem
                    onClick={() => {
                      setPersonalWorkspace();
                      queryClient.invalidateQueries();
                      router.push("/dashboard");
                      router.refresh();
                    }}
                  >
                    <User className="size-4" />
                    {t("personalSpace")}
                  </DropdownMenuItem>
                ) : null}
                {showCreateCompany ? (
                  <DropdownMenuItem asChild>
                    <Link href="/onboarding?new=1">
                      <Building2 className="size-4" />
                      {t("createCompany")}
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {showPlatformAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <Shield className="size-4" />
                      {t("platformAdminArea")}
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {showWorkspaceActions ? <DropdownMenuSeparator /> : null}
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

        <PageTransition className="px-3 pt-2 pb-4 sm:px-4 md:px-6 md:pt-3 md:pb-6">
          {children}
        </PageTransition>
      </div>
    </div>
  );
}
