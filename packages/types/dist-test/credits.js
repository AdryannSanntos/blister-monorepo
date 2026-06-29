"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustCreditSchema = exports.agentSpendSchema = exports.agentSpendItemSchema = exports.creditHistorySchema = exports.creditSummarySchema = exports.creditLedgerEntrySchema = exports.creditBalanceSchema = exports.FREE_TIER_CREDITS = exports.CREDIT_UNIT_USD = void 0;
const zod_1 = require("zod");
/** 1 credit equals US$1.00. Used across UI labels and cost estimates. */
exports.CREDIT_UNIT_USD = 1;
/** Free tier grant: 20 credits = US$20 of usage (mirrors PlatformCreditSettings.freeTierAmount default). */
exports.FREE_TIER_CREDITS = 20;
exports.creditBalanceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    companyId: zod_1.z.string(),
    amount: zod_1.z.string(), // Decimal serialized as string by Prisma
    currency: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.creditLedgerEntrySchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(['CREDIT', 'DEBIT', 'ADJUST', 'REFUND']),
    amount: zod_1.z.string(),
    balanceAfter: zod_1.z.string(),
    currency: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string(),
});
exports.creditSummarySchema = zod_1.z.object({
    balance: exports.creditBalanceSchema,
    ledger: zod_1.z.array(exports.creditLedgerEntrySchema),
});
exports.creditHistorySchema = zod_1.z.object({
    items: zod_1.z.array(exports.creditLedgerEntrySchema),
    total: zod_1.z.number(),
    page: zod_1.z.number(),
    pageSize: zod_1.z.number(),
});
exports.agentSpendItemSchema = zod_1.z.object({
    agentId: zod_1.z.string(),
    totalSpent: zod_1.z.string(), // credits (= USD), serialized Decimal
    runs: zod_1.z.number(),
});
exports.agentSpendSchema = zod_1.z.object({
    windowDays: zod_1.z.number(),
    items: zod_1.z.array(exports.agentSpendItemSchema),
});
exports.adjustCreditSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    type: zod_1.z.enum(['CREDIT', 'DEBIT', 'ADJUST']),
    reason: zod_1.z.string().min(1),
});
