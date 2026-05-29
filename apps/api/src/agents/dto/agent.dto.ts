import { z } from 'zod';

const kebabCaseSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must use lowercase kebab-case');

const jsonObjectSchema = z.record(z.string(), z.unknown()).default({});
export const agentStatusSchema = z.enum(['draft', 'active', 'archived']);
export const agentAllowedToolSchema = z.enum(['rag_search', 'file_search', 'web_research']);
export const allowedToolsSchema = z.array(agentAllowedToolSchema).max(16).default([]);

export const createCompanyAgentSchema = z.strictObject({
  templateId: z.string().min(1).optional(),
  slug: kebabCaseSchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().min(2).max(80).default('custom'),
  allowedTools: allowedToolsSchema.optional(),
  flowDefinition: jsonObjectSchema.optional(),
  inputSchema: jsonObjectSchema.optional(),
  outputSchema: jsonObjectSchema.optional(),
});

export const updateCompanyAgentSchema = z.strictObject({
  slug: kebabCaseSchema.optional(),
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  allowedTools: allowedToolsSchema.optional(),
  status: agentStatusSchema.optional(),
});

export type CreateCompanyAgentDto = z.infer<typeof createCompanyAgentSchema>;
export type UpdateCompanyAgentDto = z.infer<typeof updateCompanyAgentSchema>;
