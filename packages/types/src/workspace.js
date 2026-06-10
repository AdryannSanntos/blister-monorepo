"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCompanySchema = exports.updateRoleSchema = exports.createRoleSchema = exports.workspaceRoleSchema = exports.inviteMemberSchema = exports.teamMemberSchema = exports.memberRoleSchema = void 0;
const zod_1 = require("zod");
exports.memberRoleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    isSystem: zod_1.z.boolean(),
});
exports.teamMemberSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    email: zod_1.z.string().email(),
    userType: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    roles: zod_1.z.array(exports.memberRoleSchema),
});
exports.inviteMemberSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    roleId: zod_1.z.string().min(1),
});
exports.workspaceRoleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    isSystem: zod_1.z.boolean(),
    permissions: zod_1.z.array(zod_1.z.string()),
    memberCount: zod_1.z.number().int().nonnegative(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.createRoleSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2)
        .max(64)
        .regex(/^[a-z0-9_-]+$/i),
    permissions: zod_1.z.array(zod_1.z.string()).min(1),
});
exports.updateRoleSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2)
        .max(64)
        .regex(/^[a-z0-9_-]+$/i)
        .optional(),
    permissions: zod_1.z.array(zod_1.z.string()).min(1).optional(),
});
exports.deleteCompanySchema = zod_1.z.object({
    confirmName: zod_1.z.string().min(1),
});
