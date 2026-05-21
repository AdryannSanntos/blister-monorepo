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
  'Asset',
  'ContextAsset',
  'Integration',
] as const;

export type AppAction = (typeof actions)[number];
export type AppSubject = (typeof subjects)[number];

export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

export type AppPermissionKey =
  | 'company.read'
  | 'company.update'
  | 'company.delete'
  | 'member.read'
  | 'member.invite'
  | 'member.update'
  | 'member.remove'
  | 'role.read'
  | 'role.create'
  | 'role.update'
  | 'role.delete'
  | 'permission.read'
  | 'onboarding.publish'
  | 'brain.read'
  | 'brain.update'
  | 'asset.read'
  | 'asset.create'
  | 'asset.update'
  | 'asset.archive'
  | 'asset.context.review'
  | 'skill.read'
  | 'skill.execute'
  | 'integration.read'
  | 'output.read'
  | 'output.review';

export const allPermissionKeys: AppPermissionKey[] = [
  'company.read',
  'company.update',
  'company.delete',
  'member.read',
  'member.invite',
  'member.update',
  'member.remove',
  'role.read',
  'role.create',
  'role.update',
  'role.delete',
  'permission.read',
  'onboarding.publish',
  'brain.read',
  'brain.update',
  'asset.read',
  'asset.create',
  'asset.update',
  'asset.archive',
  'asset.context.review',
  'skill.read',
  'skill.execute',
  'integration.read',
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
  return (assignablePermissionKeys as readonly AppPermissionKey[]).includes(
    value as AppPermissionKey,
  );
}

export const defaultSystemRoles = ['owner', 'admin', 'member'] as const;

export type DefaultSystemRole = (typeof defaultSystemRoles)[number];

export const permissionMap: Record<AppPermissionKey, [AppAction, AppSubject]> = {
  'company.read': ['read', 'Company'],
  'company.update': ['update', 'Company'],
  'company.delete': ['delete', 'Company'],
  'member.read': ['read', 'Member'],
  'member.invite': ['create', 'Member'],
  'member.update': ['update', 'Member'],
  'member.remove': ['delete', 'Member'],
  'role.read': ['read', 'Role'],
  'role.create': ['create', 'Role'],
  'role.update': ['update', 'Role'],
  'role.delete': ['delete', 'Role'],
  'permission.read': ['read', 'Permission'],
  'onboarding.publish': ['update', 'Onboarding'],
  'brain.read': ['read', 'CompanyBrain'],
  'brain.update': ['update', 'CompanyBrain'],
  'asset.read': ['read', 'Asset'],
  'asset.create': ['create', 'Asset'],
  'asset.update': ['update', 'Asset'],
  'asset.archive': ['delete', 'Asset'],
  'asset.context.review': ['update', 'ContextAsset'],
  'skill.read': ['read', 'Skill'],
  'skill.execute': ['create', 'Skill'],
  'integration.read': ['read', 'Integration'],
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
        'company.update',
        'member.read',
        'member.invite',
        'member.update',
        'member.remove',
        'role.read',
        'permission.read',
        'brain.read',
        'brain.update',
        'asset.read',
        'asset.create',
        'asset.update',
        'asset.archive',
        'asset.context.review',
        'skill.read',
        'skill.execute',
        'integration.read',
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
  isOwner = false,
): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (isOwner) {
    can('manage', 'all');
  } else {
    for (const key of permissionKeys) {
      const mapping = permissionMap[key];
      if (mapping) {
        can(mapping[0], mapping[1]);
      }
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
