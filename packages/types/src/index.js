"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCompanySchema = exports.defaultSystemRoleSchema = exports.subjectSchema = exports.actionSchema = exports.companySlugSchema = void 0;
const zod_1 = require("zod");
const actions = ['create', 'read', 'update', 'delete', 'manage'];
const subjects = [
    'all',
    'Company',
    'Member',
    'Role',
    'Permission',
    'CompanyBrain',
    'Skill',
    'Output',
];
const defaultSystemRoles = ['owner', 'admin', 'member'];
exports.companySlugSchema = zod_1.z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/);
exports.actionSchema = zod_1.z.enum(actions);
exports.subjectSchema = zod_1.z.enum(subjects);
exports.defaultSystemRoleSchema = zod_1.z.enum(defaultSystemRoles);
exports.createCompanySchema = zod_1.z.strictObject({
    name: zod_1.z.string().min(2).max(120),
    slug: exports.companySlugSchema,
});
//# sourceMappingURL=index.js.map