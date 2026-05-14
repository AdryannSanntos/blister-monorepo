import { type MongoAbility } from '@casl/ability';
export declare const actions: readonly ["create", "read", "update", "delete", "manage"];
export declare const subjects: readonly ["all", "Company", "Member", "Role", "Permission", "Onboarding", "CompanyBrain", "Skill", "Output"];
export type AppAction = (typeof actions)[number];
export type AppSubject = (typeof subjects)[number];
export type AppAbility = MongoAbility<[AppAction, AppSubject]>;
export type AppPermissionKey = 'company.read' | 'company.update' | 'member.read' | 'member.invite' | 'member.update' | 'role.read' | 'role.create' | 'role.update' | 'role.delete' | 'permission.read' | 'onboarding.publish' | 'brain.read' | 'brain.update' | 'skill.read' | 'skill.execute' | 'output.read' | 'output.review';
export declare const allPermissionKeys: AppPermissionKey[];
export declare const assignablePermissionKeys: ("company.read" | "company.update" | "member.read" | "member.invite" | "member.update" | "role.read" | "role.create" | "role.update" | "role.delete" | "permission.read" | "brain.read" | "brain.update" | "skill.read" | "skill.execute" | "output.read" | "output.review")[];
export declare function isAppPermissionKey(value: string): value is AppPermissionKey;
export declare function isAssignablePermissionKey(value: string): value is AppPermissionKey;
export declare const defaultSystemRoles: readonly ["owner", "admin", "member"];
export type DefaultSystemRole = (typeof defaultSystemRoles)[number];
export type PermissionOverrideEffect = 'allow' | 'deny';
export interface PermissionOverride {
    key: AppPermissionKey;
    effect: PermissionOverrideEffect;
}
export declare function getDefaultRolePermissions(role: DefaultSystemRole): AppPermissionKey[];
export declare function defineAbilityForPermissions(permissionKeys: AppPermissionKey[], overrides?: PermissionOverride[]): AppAbility;
