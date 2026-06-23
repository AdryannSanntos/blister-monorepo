"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewCutsSchema = exports.cutDecisionSchema = exports.cutsRunOutputSchema = exports.cutsRunInputSchema = exports.cutsTranscriptSegmentSchema = exports.cutsTranscriptWordSchema = exports.cutOutputSchema = exports.cutReviewStatusSchema = exports.cutsAgentSettingsSchema = exports.normalizeCutsModelTier = exports.CUTS_ENABLED_MODEL_TIERS = exports.cutsRunOptionsSchema = exports.cutsProcessingTimeframeSchema = exports.cutsVideoGenreSchema = exports.cutsModelTierSchema = void 0;
const zod_1 = require("zod");
exports.cutsModelTierSchema = zod_1.z.enum(['auto', 'basic', 'pro']);
exports.cutsVideoGenreSchema = zod_1.z.enum([
    'podcast',
    'live',
    'tutorial',
    'interview',
    'vlog',
    'storytelling',
    'other',
]);
exports.cutsProcessingTimeframeSchema = zod_1.z
    .object({
    startSec: zod_1.z.number().int().nonnegative(),
    endSec: zod_1.z.number().int().positive(),
})
    .refine((data) => data.endSec > data.startSec, {
    message: 'endSec must be greater than startSec',
    path: ['endSec'],
});
exports.cutsRunOptionsSchema = zod_1.z.object({
    videoGenre: exports.cutsVideoGenreSchema.optional(),
    processingTimeframe: exports.cutsProcessingTimeframeSchema.optional(),
});
/** Model tiers enabled for production runs (auto/pro reserved for future). */
exports.CUTS_ENABLED_MODEL_TIERS = ['basic'];
const normalizeCutsModelTier = (tier) => exports.CUTS_ENABLED_MODEL_TIERS.includes(tier)
    ? tier
    : 'basic';
exports.normalizeCutsModelTier = normalizeCutsModelTier;
exports.cutsAgentSettingsSchema = zod_1.z
    .object({
    maxCuts: zod_1.z.number().int().min(1).max(20).default(5),
    cutDurationSec: zod_1.z.number().int().min(15).max(180).default(60),
    deleteSourceAfterRun: zod_1.z.boolean().default(false),
    addCaptions: zod_1.z.boolean().default(false),
    captionStyleId: zod_1.z.string().min(1).optional(),
    autoAcceptResults: zod_1.z.boolean().default(true),
    modelTier: exports.cutsModelTierSchema.default('basic'),
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
    /** Rendered clip stored as a workspace file (preferred for preview). */
    cutFileId: zod_1.z.string().min(1).optional(),
    previewUrl: zod_1.z.string().optional(),
});
/**
 * A single spoken word with its own timestamps (seconds, source-relative).
 * Sourced from the ASR word-level output (AssemblyAI utterance words);
 * enables word-accurate seek and karaoke-style highlighting in the UI.
 */
exports.cutsTranscriptWordSchema = zod_1.z.object({
    text: zod_1.z.string(),
    startSec: zod_1.z.number().nonnegative(),
    endSec: zod_1.z.number().nonnegative(),
});
/**
 * A timed transcript line surfaced to the UI. Emitted by the cuts agent's
 * `resolve_source` step (`analyzedSegments`); seconds are relative to the
 * source video. `speaker` is the diarization label when available. `words`
 * carries word-level timestamps when the provider resolves them.
 */
exports.cutsTranscriptSegmentSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    startSec: zod_1.z.number().nonnegative(),
    endSec: zod_1.z.number().nonnegative(),
    text: zod_1.z.string(),
    speaker: zod_1.z.string().optional(),
    words: zod_1.z.array(exports.cutsTranscriptWordSchema).optional(),
});
exports.cutsRunInputSchema = zod_1.z.object({
    userInput: zod_1.z.string().trim().min(1).max(10_000),
    sourceFileId: zod_1.z.string().min(1),
    settings: exports.cutsAgentSettingsSchema,
    options: exports.cutsRunOptionsSchema.optional(),
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
