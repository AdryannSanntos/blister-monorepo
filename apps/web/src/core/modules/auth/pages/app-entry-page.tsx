"use client";

import { useEffect } from "react";
import { authClient } from "src/core/shared/utils/auth-client";

import { useRouter } from "@/i18n/routing";

export function AppEntryPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  useEffect(() => {
    if (isSessionPending) return;

    if (!session?.user) {
      router.replace("/auth/login");
      return;
    }

    router.replace("/dashboard");
  }, [isSessionPending, session?.user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
    </div>
  );
}
