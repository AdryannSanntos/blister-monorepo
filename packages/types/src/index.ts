import { z } from 'zod';

const actions = ['create', 'read', 'update', 'delete', 'manage'] as const;

const subjects = [
  'all',
  'Company',
  'Member',
  'Role',
  'Permission',
  'CompanyBrain',
  'Skill',
  'Output',
] as const;

const defaultSystemRoles = ['owner', 'admin', 'member'] as const;

export const companySlugSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9-]+$/);

export const actionSchema = z.enum(actions);
export const subjectSchema = z.enum(subjects);
export const defaultSystemRoleSchema = z.enum(defaultSystemRoles);

export const createCompanySchema = z.strictObject({
  name: z.string().min(2).max(120),
  slug: companySlugSchema,
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export * from './rag/index';
