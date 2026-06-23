"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
__exportStar(require("./agents"), exports);
__exportStar(require("./agents/cuts"), exports);
__exportStar(require("./company"), exports);
__exportStar(require("./credits"), exports);
__exportStar(require("./ai-catalog"), exports);
__exportStar(require("./workspace"), exports);
__exportStar(require("./agent-message-sequence"), exports);
__exportStar(require("./blister-os"), exports);
__exportStar(require("./files/workspace-agent-folders"), exports);
