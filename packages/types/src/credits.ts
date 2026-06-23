import { z } from 'zod';

/** 1 credit equals US$1.00. Used across UI labels and cost estimates. */
export const CREDIT_UNIT_USD = 1;

/** Free tier grant: 20 credits = US$20 of usage (mirrors PlatformCreditSettings.freeTierAmount default). */
export const FREE_TIER_CREDITS = 20;

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

export const agentSpendItemSchema = z.object({
  agentId: z.string(),
  totalSpent: z.string(), // credits (= USD), serialized Decimal
  runs: z.number(),
});
export type AgentSpendItem = z.infer<typeof agentSpendItemSchema>;

export const agentSpendSchema = z.object({
  windowDays: z.number(),
  items: z.array(agentSpendItemSchema),
});
export type AgentSpend = z.infer<typeof agentSpendSchema>;

export const adjustCreditSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['CREDIT', 'DEBIT', 'ADJUST']),
  reason: z.string().min(1),
});
export type AdjustCreditDto = z.infer<typeof adjustCreditSchema>;
