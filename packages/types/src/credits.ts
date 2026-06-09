import { z } from 'zod';

export const creditBalanceSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  amount: z.string(), // Decimal serialized as string by Prisma
  currency: z.string(),
  updatedAt: z.string(),
});
export type CreditBalance = z.infer<typeof creditBalanceSchema>;

export const creditLedgerEntrySchema = z.object({
  id: z.string(),
  type: z.enum(['CREDIT', 'DEBIT', 'ADJUST', 'REFUND']),
  amount: z.string(),
  balanceAfter: z.string(),
  currency: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
});
export type CreditLedgerEntry = z.infer<typeof creditLedgerEntrySchema>;

export const creditSummarySchema = z.object({
  balance: creditBalanceSchema,
  ledger: z.array(creditLedgerEntrySchema),
});
export type CreditSummary = z.infer<typeof creditSummarySchema>;

export const creditHistorySchema = z.object({
  items: z.array(creditLedgerEntrySchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type CreditHistory = z.infer<typeof creditHistorySchema>;

export const adjustCreditSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['CREDIT', 'DEBIT', 'ADJUST']),
  reason: z.string().min(1),
});
export type AdjustCreditDto = z.infer<typeof adjustCreditSchema>;
