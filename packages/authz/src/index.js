"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSystemRoles = exports.assignablePermissionKeys = exports.allPermissionKeys = exports.subjects = exports.actions = void 0;
exports.isAppPermissionKey = isAppPermissionKey;
exports.isAssignablePermissionKey = isAssignablePermissionKey;
exports.getDefaultRolePermissions = getDefaultRolePermissions;
exports.defineAbilityForPermissions = defineAbilityForPermissions;
const ability_1 = require("@casl/ability");
exports.actions = ['create', 'read', 'update', 'delete', 'manage'];
exports.subjects = [
    'all',
    'Company',
    'Member',
    'Role',
    'Permission',
    'Onboarding',
    'CompanyBrain',
    'Skill',
    'Output',
];
exports.allPermissionKeys = [
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
exports.assignablePermissionKeys = exports.allPermissionKeys.filter((key) => key !== 'onboarding.publish');
function isAppPermissionKey(value) {
    return exports.allPermissionKeys.includes(value);
}
function isAssignablePermissionKey(value) {
    return exports.assignablePermissionKeys.includes(value);
}
exports.defaultSystemRoles = ['owner', 'admin', 'member'];
const permissionMap = {
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
function getDefaultRolePermissions(role) {
    switch (role) {
        case 'owner':
            return [...exports.allPermissionKeys];
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
function defineAbilityForPermissions(permissionKeys, overrides = []) {
    const { can, cannot, build } = new ability_1.AbilityBuilder(ability_1.createMongoAbility);
    for (const key of permissionKeys) {
        const mapping = permissionMap[key];
        if (mapping) {
            can(mapping[0], mapping[1]);
        }
    }
    for (const override of overrides) {
        const mapping = permissionMap[override.key];
        if (!mapping)
            continue;
        if (override.effect === 'allow') {
            can(mapping[0], mapping[1]);
        }
        else {
            cannot(mapping[0], mapping[1]);
        }
    }
    return build();
}
//# sourceMappingURL=index.js.map