import { z } from 'zod';

export const ONBOARDING_STEPS = [
  'welcome',
  'company-basics',
  'positioning',
  'products-services',
  'target-audience',
  'tone-of-voice',
  'differentials-faq',
  'processes-rules',
  'review-publish',
] as const;

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

export const upsertOnboardingDraftSchema = z.object({
  currentStep: z
    .number()
    .int()
    .min(0)
    .max(TOTAL_STEPS - 1),
  data: z.record(z.string(), z.unknown()),
});

export const publishOnboardingSchema = z.strictObject({
  userId: z.string().min(1, 'userId is required'),
});

export type UpsertOnboardingDraftDto = z.infer<typeof upsertOnboardingDraftSchema>;
export type PublishOnboardingDto = z.infer<typeof publishOnboardingSchema>;
