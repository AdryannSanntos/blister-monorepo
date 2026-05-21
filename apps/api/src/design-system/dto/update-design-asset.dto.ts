import { createDesignAssetSchema } from './create-design-asset.dto';

export const updateDesignAssetSchema = createDesignAssetSchema
  .omit({ objectKey: true, fileName: true, contentType: true, size: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'at least one field must be provided',
  });

export type UpdateDesignAssetDto = typeof updateDesignAssetSchema._output;
