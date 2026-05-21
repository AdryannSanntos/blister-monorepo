import { createColorGroupSchema } from './create-color-group.dto';

export const updateColorGroupSchema = createColorGroupSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'at least one field must be provided' },
);

export type UpdateColorGroupDto = typeof updateColorGroupSchema._output;
