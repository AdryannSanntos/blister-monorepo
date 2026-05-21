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
  'Agent',
  'AgentRun',
  'Asset',
  'CreditLedger',
  'ContextAsset',
  'ContextSource',
  'DesignSystem',
  'DesignAsset',
  'Skill',
  'Output',
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
  | 'agent.read'
  | 'agent.create'
  | 'agent.update'
  | 'agent.delete'
  | 'agent.publish'
  | 'agent.execute'
  | 'agent.run.read'
  | 'agent.run.review'
  | 'asset.read'
  | 'asset.create'
  | 'asset.update'
  | 'asset.archive'
  | 'asset.context.review'
  | 'credit.read'
  | 'credit.manage'
  | 'context.read'
  | 'context.create'
  | 'context.update'
  | 'context.delete'
  | 'context.review'
  | 'context.publish'
  | 'design-system.read'
  | 'design-system.update'
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
  'agent.read',
  'agent.create',
  'agent.update',
  'agent.delete',
  'agent.publish',
  'agent.execute',
  'agent.run.read',
  'agent.run.review',
  'asset.read',
  'asset.create',
  'asset.update',
  'asset.archive',
  'asset.context.review',
  'credit.read',
  'credit.manage',
  'context.read',
  'context.create',
  'context.update',
  'context.delete',
  'context.review',
  'context.publish',
  'design-system.read',
  'design-system.update',
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
  'agent.read': ['read', 'Agent'],
  'agent.create': ['create', 'Agent'],
  'agent.update': ['update', 'Agent'],
  'agent.delete': ['delete', 'Agent'],
  'agent.publish': ['update', 'Agent'],
  'agent.execute': ['create', 'AgentRun'],
  'agent.run.read': ['read', 'AgentRun'],
  'agent.run.review': ['update', 'AgentRun'],
  'asset.read': ['read', 'Asset'],
  'asset.create': ['create', 'Asset'],
  'asset.update': ['update', 'Asset'],
  'asset.archive': ['delete', 'Asset'],
  'asset.context.review': ['update', 'ContextAsset'],
  'credit.read': ['read', 'CreditLedger'],
  'credit.manage': ['manage', 'CreditLedger'],
  'context.read': ['read', 'ContextSource'],
  'context.create': ['create', 'ContextSource'],
  'context.update': ['update', 'ContextSource'],
  'context.delete': ['delete', 'ContextSource'],
  'context.review': ['update', 'ContextSource'],
  'context.publish': ['create', 'ContextSource'],
  'design-system.read': ['read', 'DesignSystem'],
  'design-system.update': ['update', 'DesignSystem'],
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
        'agent.read',
        'agent.execute',
        'agent.run.read',
        'asset.read',
        'asset.create',
        'asset.update',
        'asset.archive',
        'asset.context.review',
        'context.read',
        'context.create',
        'context.update',
        'context.delete',
        'context.review',
        'context.publish',
        'design-system.read',
        'design-system.update',
        'skill.read',
        'skill.execute',
        'integration.read',
        'output.read',
        'output.review',
      ];
    case 'member':
      return [
        'company.read',
        'brain.read',
        'agent.read',
        'agent.execute',
        'agent.run.read',
        'context.read',
        'skill.read',
        'skill.execute',
        'output.read',
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
