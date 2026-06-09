import { AbilityBuilder, type MongoAbility, createMongoAbility } from '@casl/ability';

export const actions = ['create', 'read', 'update', 'delete', 'manage'] as const;

export const subjects = [
  'all',
  'User',
  'Member',
  'Role',
  'Permission',
  'Company',
  'Brand',
  'Campaign',
  'File',
  'ContentPiece',
  'Credit',
  'Generation',
] as const;

export type AppAction = (typeof actions)[number];
export type AppSubject = (typeof subjects)[number];

export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

export type AppPermissionKey =
  // User / RBAC (admin workspace)
  | 'user.read'
  | 'user.update'
  | 'member.read'
  | 'member.invite'
  | 'member.update'
  | 'member.remove'
  | 'role.read'
  | 'role.create'
  | 'role.update'
  | 'role.delete'
  | 'permission.read'
  // Company / Brand Brain
  | 'company.read'
  | 'company.update'
  | 'company.delete'
  | 'brand.read'
  | 'brand.update'
  // Campaigns
  | 'campaign.read'
  | 'campaign.create'
  | 'campaign.update'
  | 'campaign.delete'
  | 'campaign.generate'
  // Campaign files
  | 'file.create'
  | 'file.delete'
  // Content pieces / review
  | 'piece.read'
  | 'piece.approve'
  | 'piece.update'
  // Credits
  | 'credit.read'
  // Quick generation
  | 'generation.create';

export const allPermissionKeys: AppPermissionKey[] = [
  'user.read',
  'user.update',
  'member.read',
  'member.invite',
  'member.update',
  'member.remove',
  'role.read',
  'role.create',
  'role.update',
  'role.delete',
  'permission.read',
  'company.read',
  'company.update',
  'company.delete',
  'brand.read',
  'brand.update',
  'campaign.read',
  'campaign.create',
  'campaign.update',
  'campaign.delete',
  'campaign.generate',
  'file.create',
  'file.delete',
  'piece.read',
  'piece.approve',
  'piece.update',
  'credit.read',
  'generation.create',
];

export const assignablePermissionKeys = allPermissionKeys;

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
  'user.read': ['read', 'User'],
  'user.update': ['update', 'User'],
  'member.read': ['read', 'Member'],
  'member.invite': ['create', 'Member'],
  'member.update': ['update', 'Member'],
  'member.remove': ['delete', 'Member'],
  'role.read': ['read', 'Role'],
  'role.create': ['create', 'Role'],
  'role.update': ['update', 'Role'],
  'role.delete': ['delete', 'Role'],
  'permission.read': ['read', 'Permission'],
  'company.read': ['read', 'Company'],
  'company.update': ['update', 'Company'],
  'company.delete': ['delete', 'Company'],
  'brand.read': ['read', 'Brand'],
  'brand.update': ['update', 'Brand'],
  'campaign.read': ['read', 'Campaign'],
  'campaign.create': ['create', 'Campaign'],
  'campaign.update': ['update', 'Campaign'],
  'campaign.delete': ['delete', 'Campaign'],
  'campaign.generate': ['create', 'Generation'],
  'file.create': ['create', 'File'],
  'file.delete': ['delete', 'File'],
  'piece.read': ['read', 'ContentPiece'],
  'piece.approve': ['update', 'ContentPiece'],
  'piece.update': ['update', 'ContentPiece'],
  'credit.read': ['read', 'Credit'],
  'generation.create': ['create', 'Generation'],
};

export type PermissionOverrideEffect = 'allow' | 'deny';

export interface PermissionOverride {
  key: AppPermissionKey;
  effect: PermissionOverrideEffect;
}

/** Default business-owner permissions (role `member` in MVP — one user per company). */
export const businessPermissionKeys: AppPermissionKey[] = [
  'company.read',
  'company.update',
  'brand.read',
  'brand.update',
  'campaign.read',
  'campaign.create',
  'campaign.update',
  'campaign.delete',
  'campaign.generate',
  'file.create',
  'file.delete',
  'piece.read',
  'piece.approve',
  'piece.update',
  'credit.read',
  'generation.create',
  'user.read',
];

export function getDefaultRolePermissions(role: DefaultSystemRole): AppPermissionKey[] {
  switch (role) {
    case 'owner':
      return [...allPermissionKeys];
    case 'admin':
      return [
        ...businessPermissionKeys,
        'member.read',
        'member.invite',
        'member.update',
        'member.remove',
        'role.read',
        'permission.read',
      ];
    case 'member':
      return [...businessPermissionKeys, 'member.read', 'role.read'];
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
