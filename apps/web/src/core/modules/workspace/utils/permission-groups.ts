import type { AppPermissionKey } from "@company-os/authz";
import { allPermissionKeys } from "@company-os/authz";

export type PermissionGroupId =
  | "users"
  | "members"
  | "roles"
  | "permissions"
  | "company"
  | "workspace"
  | "files"
  | "projects"
  | "credits"
  | "generation";

export type PermissionGroup = {
  id: PermissionGroupId;
  labelKey: PermissionGroupId;
  permissions: AppPermissionKey[];
};

const groupDefinitions: Array<{
  id: PermissionGroupId;
  prefix: string;
}> = [
  { id: "users", prefix: "user." },
  { id: "members", prefix: "member." },
  { id: "roles", prefix: "role." },
  { id: "permissions", prefix: "permission." },
  { id: "company", prefix: "company." },
  { id: "workspace", prefix: "workspace." },
  { id: "files", prefix: "file." },
  { id: "projects", prefix: "project." },
  { id: "credits", prefix: "credit." },
  { id: "generation", prefix: "generation." },
];

export const permissionGroups: PermissionGroup[] = groupDefinitions.map(
  (group) => ({
    id: group.id,
    labelKey: group.id,
    permissions: allPermissionKeys.filter((key) =>
      key.startsWith(group.prefix),
    ) as AppPermissionKey[],
  }),
);

export const assignablePermissionGroups = permissionGroups.filter(
  (group) => group.permissions.length > 0,
);
