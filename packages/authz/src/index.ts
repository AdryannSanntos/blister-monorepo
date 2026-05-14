import { AbilityBuilder, type MongoAbility, createMongoAbility } from '@casl/ability';

export const actions = ['create', 'read', 'update', 'delete', 'manage'] as const;

export const subjects = [
  'all',
  'Company',
  'Member',
  'Role',
  'Permission',
  'Onboarding',
  'CompanyBrain',
  'Skill',
  'Output',
] as const;

export type AppAction = (typeof actions)[number];
export type AppSubject = (typeof subjects)[number];

export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

export type AppPermissionKey =
  | 'company.read'
  | 'company.update'
  | 'member.read'
  | 'member.invite'
  | 'member.update'
  | 'role.read'
  | 'role.create'
  | 'role.update'
  | 'role.delete'
  | 'permission.read'
  | 'onboarding.publish'
  | 'brain.read'
  | 'brain.update'
  | 'skill.read'
  | 'skill.execute'
  | 'output.read'
  | 'output.review';

export const allPermissionKeys: AppPermissionKey[] = [
  'company.read',
  'company.update',
  'member.read',
  'member.invite',
  'member.update',
  'role.read',
  'role.create',
  'role.update',
  'role.delete',
  'permission.read',
  'onboarding.publish',
  'brain.read',
  'brain.update',
  'skill.read',
  'skill.execute',
  'output.read',
  'output.review',
];

export const assignablePermissionKeys = allPermissionKeys.filter(
  (key) => key !== 'onboarding.publish',
);

export function isAppPermissionKey(value: string): value is AppPermissionKey {
  return allPermissionKeys.includes(value as AppPermissionKey);
}

export function isAssignablePermissionKey(value: string): value is AppPermissionKey {
  return (assignablePermissionKeys as readonly AppPermissionKey[]).includes(value as AppPermissionKey);
}

export const defaultSystemRoles = ['owner', 'admin', 'member'] as const;

export type DefaultSystemRole = (typeof defaultSystemRoles)[number];

const permissionMap: Record<AppPermissionKey, [AppAction, AppSubject]> = {
  'company.read': ['read', 'Company'],
  'company.update': ['update', 'Company'],
  'member.read': ['read', 'Member'],
  'member.invite': ['create', 'Member'],
  'member.update': ['update', 'Member'],
  'role.read': ['read', 'Role'],
  'role.create': ['create', 'Role'],
  'role.update': ['update', 'Role'],
  'role.delete': ['delete', 'Role'],
  'permission.read': ['read', 'Permission'],
  'onboarding.publish': ['update', 'Onboarding'],
  'brain.read': ['read', 'CompanyBrain'],
  'brain.update': ['update', 'CompanyBrain'],
  'skill.read': ['read', 'Skill'],
  'skill.execute': ['create', 'Skill'],
  'output.read': ['read', 'Output'],
  'output.review': ['update', 'Output'],
};

export type PermissionOverrideEffect = 'allow' | 'deny';

export interface PermissionOverride {
  key: AppPermissionKey;
  effect: PermissionOverrideEffect;
}

export function getDefaultRolePermissions(role: DefaultSystemRole): AppPermissionKey[] {
  switch (role) {
    case 'owner':
      return [...allPermissionKeys];
    case 'admin':
      return [
        'company.read',
        'member.read',
        'member.invite',
        'member.update',
        'role.read',
        'permission.read',
        'brain.read',
        'brain.update',
        'skill.read',
        'skill.execute',
        'output.read',
        'output.review',
      ];
    case 'member':
      return ['company.read', 'brain.read', 'skill.read', 'skill.execute', 'output.read'];
  }
}

export function defineAbilityForPermissions(
  permissionKeys: AppPermissionKey[],
  overrides: PermissionOverride[] = [],
): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  for (const key of permissionKeys) {
    const mapping = permissionMap[key];
    if (mapping) {
      can(mapping[0], mapping[1]);
    }
  }

  for (const override of overrides) {
    const mapping = permissionMap[override.key];
    if (!mapping) continue;

    if (override.effect === 'allow') {
      can(mapping[0], mapping[1]);
    } else {
      cannot(mapping[0], mapping[1]);
    }
  }

  return build();
}
