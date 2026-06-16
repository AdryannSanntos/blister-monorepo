"use client";

import { ChevronsUpDown, LogOut, Moon, Shield, Sun, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { usePlatformRoleAccess } from "src/core/modules/platform-admin/hooks/use-platform-admin";
import { Avatar, AvatarFallback } from "src/core/shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
import { authClient } from "src/core/shared/utils/auth-client";
import { queryClient } from "src/core/shared/utils/query-client";

import { useRouter } from "@/i18n/routing";

export function UserTrigger({
  collapsed,
  displayName,
  email,
  userInitials,
}: {
  collapsed: boolean;
  displayName: string;
  email: string;
  userInitials: string;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const t = useTranslations("dashboard");
  const { canAccessPlatformAdmin } = usePlatformRoleAccess();

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            collapsed
              ? "flex size-10 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-canvas)]"
              : "flex w-full items-center gap-2.5 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-canvas)] p-2 text-left"
          }
        >
          <Avatar className={collapsed ? "size-8" : "size-9"}>
            <AvatarFallback className="text-[11px]">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                  {displayName}
                </p>
                <p className="truncate text-[11.5px] text-[var(--fg-tertiary)]">
                  {email}
                </p>
              </div>
              <ChevronsUpDown className="size-3.5 shrink-0 text-[var(--fg-quaternary)]" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-56">
        {canAccessPlatformAdmin ? (
          <>
            <DropdownMenuItem onClick={() => router.push("/admin")}>
              <Shield />
              {t("platformAdmin")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem
          onClick={() => router.push("/dashboard/account/settings")}
        >
          <User />
          {t("accountSettings")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
          {t("toggleTheme")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut />
          {t("signOutShort")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
