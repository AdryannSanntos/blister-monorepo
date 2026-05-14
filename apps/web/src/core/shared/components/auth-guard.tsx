"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useOnboardingStatus } from "src/core/modules/onboarding/hooks/use-onboarding";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { useUserOrganizations } from "src/core/modules/organization/hooks/use-organizations";
import { authClient } from "src/core/shared/utils/auth-client";

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user?.id;
  const { data: orgs, isLoading: orgsLoading } = useUserOrganizations(userId);
  const { activeOrgId, setActiveOrgId } = useActiveOrganization();
  const { data: onboardingStatus, isLoading: onboardingLoading } =
    useOnboardingStatus(activeOrgId);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      router.replace("/auth/login");
      return;
    }

    if (orgsLoading) return;

    if (!orgs || orgs.length === 0) {
      router.replace("/workspace/create");
      return;
    }

    if (!activeOrgId) {
      if (orgs.length === 1) {
        setActiveOrgId(orgs[0].id);
      } else {
        router.replace("/workspace/select");
        return;
      }
    }

    if (onboardingLoading) return;

    const isOnboardingRoute = pathname.startsWith("/onboarding");

    if (onboardingStatus && !onboardingStatus.published && !isOnboardingRoute) {
      router.replace("/onboarding");
      return;
    }

    setReady(true);
  }, [
    session,
    isPending,
    orgs,
    orgsLoading,
    activeOrgId,
    router,
    setActiveOrgId,
    onboardingStatus,
    onboardingLoading,
    pathname,
  ]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
