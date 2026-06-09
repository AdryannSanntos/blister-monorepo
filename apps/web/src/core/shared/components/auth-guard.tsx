"use client";

import { useEffect, useState } from "react";
import { authClient } from "src/core/shared/utils/auth-client";

import { usePathname, useRouter } from "@/i18n/routing";

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      const next = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/auth/login?next=${next}`);
      return;
    }

    setReady(true);
  }, [session, isPending, router, pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
