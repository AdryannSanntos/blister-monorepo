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
  'Workspace',
  'WorkspaceSettings',
  'Project',
  'MarketplaceItem',
  'LibraryItem',
  'AgentRun',
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
  // Company / legacy Brand Brain
  | 'company.read'
  | 'company.update'
  | 'company.delete'
  | 'brand.read'
  | 'brand.update'
  // Workspace OS
  | 'workspace.read'
  | 'workspace.settings.read'
  | 'workspace.settings.update'
  // Campaigns (legacy)
  | 'campaign.read'
  | 'campaign.create'
  | 'campaign.update'
  | 'campaign.delete'
  | 'campaign.generate'
  // Files
  | 'file.create'
  | 'file.read'
  | 'file.delete'
  // Projects
  | 'project.read'
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  // Content pieces / review (legacy)
  | 'piece.read'
  | 'piece.approve'
  | 'piece.update'
  // Agent runs
  | 'agentRun.review'
  // Marketplace
  | 'marketplace.read'
  | 'marketplace.redeem'
  | 'library.read'
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
  'workspace.read',
  'workspace.settings.read',
  'workspace.settings.update',
  'campaign.read',
  'campaign.create',
  'campaign.update',
  'campaign.delete',
  'campaign.generate',
  'file.create',
  'file.read',
  'file.delete',
  'project.read',
  'project.create',
  'project.update',
  'project.delete',
  'piece.read',
  'piece.approve',
  'piece.update',
  'agentRun.review',
  'marketplace.read',
  'marketplace.redeem',
  'library.read',
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

export const defaultSystemRoles = [
  'owner',
  'admin',
  'creator',
  'reviewer',
  'viewer',
] as const;

/** @deprecated Use `creator` — kept for migration compatibility */
export const legacyMemberRole = 'member' as const;

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
  'workspace.read': ['read', 'Workspace'],
  'workspace.settings.read': ['read', 'WorkspaceSettings'],
  'workspace.settings.update': ['update', 'WorkspaceSettings'],
  'campaign.read': ['read', 'Campaign'],
  'campaign.create': ['create', 'Campaign'],
  'campaign.update': ['update', 'Campaign'],
  'campaign.delete': ['delete', 'Campaign'],
  'campaign.generate': ['create', 'Generation'],
  'file.create': ['create', 'File'],
  'file.read': ['read', 'File'],
  'file.delete': ['delete', 'File'],
  'project.read': ['read', 'Project'],
  'project.create': ['create', 'Project'],
  'project.update': ['update', 'Project'],
  'project.delete': ['delete', 'Project'],
  'piece.read': ['read', 'ContentPiece'],
  'piece.approve': ['update', 'ContentPiece'],
  'piece.update': ['update', 'ContentPiece'],
  'agentRun.review': ['update', 'AgentRun'],
  'marketplace.read': ['read', 'MarketplaceItem'],
  'marketplace.redeem': ['create', 'MarketplaceItem'],
  'library.read': ['read', 'LibraryItem'],
  'credit.read': ['read', 'Credit'],
  'generation.create': ['create', 'Generation'],
};

export type PermissionOverrideEffect = 'allow' | 'deny';

export interface PermissionOverride {
  key: AppPermissionKey;
  effect: PermissionOverrideEffect;
}

export const creatorPermissionKeys: AppPermissionKey[] = [
  'company.read',
  'company.update',
  'workspace.read',
  'workspace.settings.read',
  'workspace.settings.update',
  'project.read',
  'project.create',
  'project.update',
  'project.delete',
  'file.create',
  'file.read',
  'file.delete',
  'marketplace.read',
  'marketplace.redeem',
  'library.read',
  'credit.read',
  'generation.create',
  'member.read',
  'role.read',
  'user.read',
];

/** @deprecated Use creatorPermissionKeys */
export const businessPermissionKeys: AppPermissionKey[] = [
  ...creatorPermissionKeys,
  'brand.read',
  'brand.update',
  'campaign.read',
  'campaign.create',
  'campaign.update',
  'campaign.delete',
  'campaign.generate',
  'piece.read',
  'piece.approve',
  'piece.update',
];

export function getDefaultRolePermissions(role: DefaultSystemRole | 'member'): AppPermissionKey[] {
  switch (role) {
    case 'owner':
      return [...allPermissionKeys];
    case 'admin':
      return [
        ...creatorPermissionKeys,
        'member.invite',
        'member.update',
        'member.remove',
        'permission.read',
        'brand.read',
        'brand.update',
        'campaign.read',
        'campaign.create',
        'campaign.update',
        'campaign.delete',
        'campaign.generate',
        'piece.read',
        'piece.approve',
        'piece.update',
        'agentRun.review',
      ];
    case 'creator':
    case 'member':
      return [...creatorPermissionKeys];
    case 'reviewer':
      return [
        'workspace.read',
        'workspace.settings.read',
        'project.read',
        'file.read',
        'library.read',
        'credit.read',
        'member.read',
        'role.read',
        'user.read',
        'company.read',
        'agentRun.review',
        'piece.read',
        'piece.approve',
        'piece.update',
      ];
    case 'viewer':
      return [
        'workspace.read',
        'workspace.settings.read',
        'project.read',
        'file.read',
        'library.read',
        'credit.read',
        'member.read',
        'role.read',
        'user.read',
        'company.read',
        'piece.read',
      ];
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
