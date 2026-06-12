"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewCutsSchema = exports.cutDecisionSchema = exports.cutsRunOutputSchema = exports.cutsRunInputSchema = exports.cutOutputSchema = exports.cutReviewStatusSchema = exports.cutsAgentSettingsSchema = void 0;
const zod_1 = require("zod");
exports.cutsAgentSettingsSchema = zod_1.z
    .object({
    maxCuts: zod_1.z.number().int().min(1).max(20).default(5),
    cutDurationSec: zod_1.z.number().int().min(15).max(180).default(60),
    deleteSourceAfterRun: zod_1.z.boolean().default(false),
    addCaptions: zod_1.z.boolean().default(false),
    captionStyleId: zod_1.z.string().min(1).optional(),
    autoAcceptResults: zod_1.z.boolean().default(true),
})
    .refine((data) => !data.addCaptions || Boolean(data.captionStyleId), {
    message: 'captionStyleId is required when addCaptions is true',
    path: ['captionStyleId'],
});
exports.cutReviewStatusSchema = zod_1.z.enum(['pending', 'approved', 'rejected']);
exports.cutOutputSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    startSec: zod_1.z.number().nonnegative(),
    endSec: zod_1.z.number().nonnegative(),
    durationSec: zod_1.z.number().positive(),
    viralScore: zod_1.z.number().min(0).max(100),
    reviewStatus: exports.cutReviewStatusSchema,
    previewUrl: zod_1.z.string().optional(),
});
exports.cutsRunInputSchema = zod_1.z.object({
    userInput: zod_1.z.string().trim().min(1).max(10_000),
    sourceFileId: zod_1.z.string().min(1),
    settings: exports.cutsAgentSettingsSchema,
});
exports.cutsRunOutputSchema = zod_1.z.object({
    cuts: zod_1.z.array(exports.cutOutputSchema).min(1),
    sourceFileId: zod_1.z.string().min(1),
    captionStyleId: zod_1.z.string().optional(),
});
exports.cutDecisionSchema = zod_1.z.object({
    cutId: zod_1.z.string().min(1),
    decision: zod_1.z.enum(['approve', 'reject']),
});
exports.reviewCutsSchema = zod_1.z.object({
    cutDecisions: zod_1.z.array(exports.cutDecisionSchema).min(1),
});
