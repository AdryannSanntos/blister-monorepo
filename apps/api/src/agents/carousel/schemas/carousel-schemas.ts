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
