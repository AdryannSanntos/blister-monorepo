"use client";

import { useInvitations } from "src/core/modules/organization/hooks/use-invitations";
import { useOrganizationMembers } from "src/core/modules/organization/hooks/use-members";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { useUserOrganizations } from "src/core/modules/organization/hooks/use-organizations";
import {
  useOnboardingDraft,
  useOnboardingStatus,
} from "src/core/modules/onboarding/hooks/use-onboarding";
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
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const sessionUser = (session?.user as SessionUser | undefined) ?? null;
  const { activeOrgId, setActiveOrgId, clearActiveOrg, isLoaded } =
    useActiveOrganization();
  const organizationsQuery = useUserOrganizations(sessionUser?.id);
  const organizations = organizationsQuery.data ?? [];
  const fallbackOrganization = organizations.length === 1 ? organizations[0] : null;
  const activeOrganization =
    organizations.find((organization) => organization.id === activeOrgId) ??
    fallbackOrganization;

  const membersQuery = useOrganizationMembers(activeOrganization?.id ?? null);
  const invitationsQuery = useInvitations(activeOrganization?.id ?? null);
  const onboardingStatusQuery = useOnboardingStatus(activeOrganization?.id ?? null);
  const onboardingDraftQuery = useOnboardingDraft(activeOrganization?.id ?? null);

  const members = membersQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];
  const pendingInvitations = invitations.filter(
    (invitation) => invitation.status === "pending",
  );
  const onboardingPublished = onboardingStatusQuery.data?.published ?? false;
  const activeRole = activeOrganization?.roles[0]?.name ?? null;
  const displayName = getUserDisplayName(sessionUser);

  const isLoading =
    isSessionPending ||
    !isLoaded ||
    organizationsQuery.isLoading ||
    (Boolean(activeOrganization) &&
      (membersQuery.isLoading ||
        invitationsQuery.isLoading ||
        onboardingStatusQuery.isLoading ||
        onboardingDraftQuery.isLoading));

  return {
    sessionUser,
    displayName,
    activeOrgId,
    activeOrganization,
    activeRole,
    organizations,
    members,
    invitations,
    pendingInvitations,
    onboardingDraft: onboardingDraftQuery.data ?? null,
    onboardingPublished,
    setActiveOrgId,
    clearActiveOrg,
    isLoading,
  };
}
