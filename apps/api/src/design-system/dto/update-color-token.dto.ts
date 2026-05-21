import { createColorTokenSchema } from './create-color-token.dto';

export const updateColorTokenSchema = createColorTokenSchema
  .omit({ colorGroupId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'at least one field must be provided',
  });

export type UpdateColorTokenDto = typeof updateColorTokenSchema._output;
