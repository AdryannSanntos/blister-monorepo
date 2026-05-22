export type PostLoginOrganization = {
  id: string;
};

export type PostLoginRoutingState = {
  destination: "/workspaces/create" | "/workspaces" | "/dashboard";
  activeOrgId: string | null;
};

export function resolvePostLoginRouting(
  organizations: PostLoginOrganization[],
  activeOrgId?: string | null,
): PostLoginRoutingState {
  if (organizations.length === 0) {
    return {
      destination: "/workspaces/create",
      activeOrgId: null,
    };
  }

  if (organizations.length > 1) {
    return {
      destination: "/workspaces",
      activeOrgId: null,
    };
  }

  const onlyOrganizationId = organizations[0]?.id ?? null;

  return {
    destination: "/dashboard",
    activeOrgId:
      activeOrgId === onlyOrganizationId ? activeOrgId : onlyOrganizationId,
  };
}
