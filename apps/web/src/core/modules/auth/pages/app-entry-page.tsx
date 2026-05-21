"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { useUserOrganizations } from "src/core/modules/organization/hooks/use-organizations";
import { authClient } from "src/core/shared/utils/auth-client";

export function AppEntryPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { activeOrgId, setActiveOrgId, clearActiveOrg, isLoaded } =
    useActiveOrganization();
  const { data: organizations, isLoading: isOrganizationsLoading } =
    useUserOrganizations(session?.user?.id);

  const validActiveOrgId = organizations?.some((org) => org.id === activeOrgId)
    ? activeOrgId
    : null;
  const fallbackOrgId =
    organizations?.length === 1 ? organizations[0].id : null;
  const selectedOrgId = validActiveOrgId ?? fallbackOrgId;

  useEffect(() => {
    if (!isLoaded || !activeOrgId || !organizations) {
      return;
    }

    if (!organizations.some((org) => org.id === activeOrgId)) {
      clearActiveOrg();
    }
  }, [activeOrgId, clearActiveOrg, isLoaded, organizations]);

  useEffect(() => {
    if (!isLoaded || !selectedOrgId || activeOrgId === selectedOrgId) {
      return;
    }

    setActiveOrgId(selectedOrgId);
  }, [activeOrgId, isLoaded, selectedOrgId, setActiveOrgId]);

  useEffect(() => {
    if (isSessionPending || !isLoaded) {
      return;
    }

    if (!session?.user) {
      router.replace("/auth/login");
      return;
    }

    if (isOrganizationsLoading) {
      return;
    }

    if (!organizations || organizations.length === 0) {
      router.replace("/workspace/create");
      return;
    }

    if (!selectedOrgId) {
      router.replace("/workspace/select");
      return;
    }

    router.replace("/dashboard");
  }, [
    isLoaded,
    isOrganizationsLoading,
    isSessionPending,
    organizations,
    router,
    selectedOrgId,
    session?.user,
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
    </div>
  );
}
