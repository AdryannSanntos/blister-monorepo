import { z } from 'zod';

export const cutsModelTierSchema = z.enum(['auto', 'basic', 'pro']);

export const cutsVideoGenreSchema = z.enum([
  'podcast',
  'live',
  'tutorial',
  'interview',
  'vlog',
  'storytelling',
  'other',
]);

export const cutsProcessingTimeframeSchema = z
  .object({
    startSec: z.number().int().nonnegative(),
    endSec: z.number().int().positive(),
  })
  .refine((data) => data.endSec > data.startSec, {
    message: 'endSec must be greater than startSec',
    path: ['endSec'],
  });

export const cutsRunOptionsSchema = z.object({
  videoGenre: cutsVideoGenreSchema.optional(),
  processingTimeframe: cutsProcessingTimeframeSchema.optional(),
});

/** Model tiers enabled for production runs (auto/pro reserved for future). */
export const CUTS_ENABLED_MODEL_TIERS = ['basic'] as const;

export type CutsEnabledModelTier = (typeof CUTS_ENABLED_MODEL_TIERS)[number];

export const normalizeCutsModelTier = (
  tier: z.infer<typeof cutsModelTierSchema>,
): CutsEnabledModelTier =>
  CUTS_ENABLED_MODEL_TIERS.includes(tier as CutsEnabledModelTier)
    ? (tier as CutsEnabledModelTier)
    : 'basic';

/**
 * Normalized overlay position (0–1 on each axis). x=0 is left edge, y=0 is the
 * top; the renderer anchors the text box center at this point in the 9:16 frame.
 */
export const overlayPositionSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export type OverlayPosition = z.infer<typeof overlayPositionSchema>;

export const cutsAgentSettingsSchema = z
  .object({
    maxCuts: z.number().int().min(1).max(20).default(5),
    cutDurationSec: z.number().int().min(15).max(180).default(60),
    deleteSourceAfterRun: z.boolean().default(false),
    addCaptions: z.boolean().default(false),
    captionStyleId: z.string().min(1).optional(),
    captionPosition: overlayPositionSchema.default({ x: 0.5, y: 0.85 }),
    addTitle: z.boolean().default(false),
    titleStyleId: z.string().min(1).optional(),
    titleDurationSec: z.number().min(1).max(10).default(5),
    titlePosition: overlayPositionSchema.default({ x: 0.5, y: 0.08 }),
    autoAcceptResults: z.boolean().default(true),
    modelTier: cutsModelTierSchema.default('basic'),
  })
  .refine((data) => !data.addCaptions || Boolean(data.captionStyleId), {
    message: 'captionStyleId is required when addCaptions is true',
    path: ['captionStyleId'],
  })
  .refine((data) => !data.addTitle || Boolean(data.titleStyleId), {
    message: 'titleStyleId is required when addTitle is true',
    path: ['titleStyleId'],
  });

export const cutReviewStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const cutOutputSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  startSec: z.number().nonnegative(),
  endSec: z.number().nonnegative(),
  durationSec: z.number().positive(),
  viralScore: z.number().min(0).max(100),
  reviewStatus: cutReviewStatusSchema,
  /** Rendered clip stored as a workspace file (preferred for preview). */
  cutFileId: z.string().min(1).optional(),
  previewUrl: z.string().optional(),
});

/**
 * A single spoken word with its own timestamps (seconds, source-relative).
 * Sourced from the ASR word-level output (AssemblyAI utterance words);
 * enables word-accurate seek and karaoke-style highlighting in the UI.
 */
export const cutsTranscriptWordSchema = z.object({
  text: z.string(),
  startSec: z.number().nonnegative(),
  endSec: z.number().nonnegative(),
});

/**
 * A timed transcript line surfaced to the UI. Emitted by the cuts agent's
 * `resolve_source` step (`analyzedSegments`); seconds are relative to the
 * source video. `speaker` is the diarization label when available. `words`
 * carries word-level timestamps when the provider resolves them.
 */
export const cutsTranscriptSegmentSchema = z.object({
  id: z.string().optional(),
  startSec: z.number().nonnegative(),
  endSec: z.number().nonnegative(),
  text: z.string(),
  speaker: z.string().optional(),
  words: z.array(cutsTranscriptWordSchema).optional(),
});

export const cutsRunInputSchema = z.object({
  userInput: z.string().trim().min(1).max(10_000),
  sourceFileId: z.string().min(1),
  settings: cutsAgentSettingsSchema,
  options: cutsRunOptionsSchema.optional(),
});

export const cutsRunOutputSchema = z.object({
  cuts: z.array(cutOutputSchema).min(1),
  sourceFileId: z.string().min(1),
  captionStyleId: z.string().optional(),
});

export const cutDecisionSchema = z.object({
  cutId: z.string().min(1),
  decision: z.enum(['approve', 'reject']),
});

export const reviewCutsSchema = z.object({
  cutDecisions: z.array(cutDecisionSchema).min(1),
});

export type CutsModelTier = z.infer<typeof cutsModelTierSchema>;
export type CutsVideoGenre = z.infer<typeof cutsVideoGenreSchema>;
export type CutsProcessingTimeframe = z.infer<typeof cutsProcessingTimeframeSchema>;
export type CutsRunOptions = z.infer<typeof cutsRunOptionsSchema>;
export type CutsAgentSettings = z.infer<typeof cutsAgentSettingsSchema>;
export type CutOutput = z.infer<typeof cutOutputSchema>;
export type CutsTranscriptWord = z.infer<typeof cutsTranscriptWordSchema>;
export type CutsTranscriptSegment = z.infer<typeof cutsTranscriptSegmentSchema>;
export type CutsRunInput = z.infer<typeof cutsRunInputSchema>;
export type CutsRunOutput = z.infer<typeof cutsRunOutputSchema>;
export type CutDecision = z.infer<typeof cutDecisionSchema>;
export type ReviewCutsDto = z.infer<typeof reviewCutsSchema>;
