import { z } from 'zod';
export declare const companySlugSchema: z.ZodString;
export declare const actionSchema: z.ZodEnum<{
    create: "create";
    read: "read";
    update: "update";
    delete: "delete";
    manage: "manage";
}>;
export declare const subjectSchema: z.ZodEnum<{
    all: "all";
    Company: "Company";
    Member: "Member";
    Role: "Role";
    Permission: "Permission";
    CompanyBrain: "CompanyBrain";
    Skill: "Skill";
    Output: "Output";
}>;
export declare const defaultSystemRoleSchema: z.ZodEnum<{
    owner: "owner";
    admin: "admin";
    member: "member";
}>;
export declare const createCompanySchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
}, z.core.$strict>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
