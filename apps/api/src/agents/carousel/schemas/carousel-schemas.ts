import { z } from 'zod';
import { carouselOutputSchema } from '@company-os/types';

export {
  carouselRunInputSchema as carouselInputZod,
  carouselOutputSchema as carouselOutputZod,
  carouselIdeaSelectionSchema,
  type CarouselRunInput,
  type CarouselOutput,
  type CarouselIdeaOption,
  type CarouselCustomIdea,
  type CarouselIdeaSelection,
  type CarouselSlideContent,
  type CarouselDesignPlan,
  type CarouselOutputSlide,
} from '@company-os/types';

/**
 * Schema for validating edited output submitted through the review/edit
 * endpoint (`AgentRunReviewService.editOutput`). Only `slides` is editable.
 */
export const carouselReviewSchema = carouselOutputSchema.pick({ slides: true });

/** Schema used by the await_content_approval pause step. */
export const contentApprovalSchema = z.object({
  contentApproved: z.literal(true),
});
