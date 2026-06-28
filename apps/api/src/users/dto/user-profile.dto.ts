import { z } from 'zod';

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

export const updateProfileDtoSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  cpf: z
    .string()
    .regex(cpfRegex, 'CPF deve estar no formato 000.000.000-00')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .min(10)
    .max(20)
    .optional()
    .or(z.literal('')),
});

export type UpdateProfileDto = z.infer<typeof updateProfileDtoSchema>;
