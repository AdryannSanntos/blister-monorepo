"use client";

import { authClient } from "src/core/shared/utils/auth-client";

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function getUserDisplayName(user: SessionUser | null | undefined) {
  if (user?.name?.trim()) {
    return user.name.trim();
  }

  if (user?.email?.includes("@")) {
    return user.email.split("@")[0];
  }

  return "Usuário";
}

export function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function useDashboardData() {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const sessionUser = (session?.user as SessionUser | undefined) ?? null;
  const displayName = getUserDisplayName(sessionUser);

  return {
    sessionUser,
    displayName,
    isLoading: isSessionPending,
  };
}
