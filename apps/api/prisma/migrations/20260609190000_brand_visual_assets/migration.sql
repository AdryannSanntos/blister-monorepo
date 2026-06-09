-- Logo variants (up to 4) and brand visual assets
ALTER TABLE "BrandProfile" ADD COLUMN "logoVariants" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "BrandProfile" ADD COLUMN "brandAssets" JSONB NOT NULL DEFAULT '[]';

-- Migrate existing primary logo into logoVariants
UPDATE "BrandProfile"
SET "logoVariants" = jsonb_build_object('primary', "logoStorageKey")
WHERE "logoStorageKey" IS NOT NULL AND "logoStorageKey" <> '';
