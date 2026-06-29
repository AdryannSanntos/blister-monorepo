import { z } from 'zod';

export {
  carouselRunInputSchema as carouselInputZod,
  carouselOutputSchema as carouselOutputZod,
  type CarouselRunInput,
  type CarouselOutput,
  type CarouselIdeaOption,
  type CarouselSlideContent,
  type CarouselDesignPlan,
  type CarouselOutputSlide,
} from '@company-os/types';

export const carouselIdeaSelectionSchema = z.object({
  selectedIdeaId: z.string(),
});
export type CarouselIdeaSelection = z.infer<typeof carouselIdeaSelectionSchema>;

export const carouselContentApprovalSchema = z.object({
  contentApproved: z.boolean(),
  slides: z.array(z.any()).optional(),
});
export type CarouselContentApproval = z.infer<typeof carouselContentApprovalSchema>;

export const carouselDesignApprovalSchema = z.object({
  designApproved: z.boolean(),
  plan: z.any().optional(),
  imageUploads: z.record(z.string(), z.string()).optional(),
});
export type CarouselDesignApproval = z.infer<typeof carouselDesignApprovalSchema>;
