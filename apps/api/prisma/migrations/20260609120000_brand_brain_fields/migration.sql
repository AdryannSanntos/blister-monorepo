-- Brand Brain: campos completos do Cérebro da Marca

CREATE TYPE "MarketingObjective" AS ENUM ('SELL_MORE', 'GENERATE_LEADS', 'STRENGTHEN_BRAND');

ALTER TABLE "BrandProfile" ADD COLUMN "visualStyle" TEXT;
ALTER TABLE "BrandProfile" ADD COLUMN "targetAudience" TEXT;
ALTER TABLE "BrandProfile" ADD COLUMN "marketingObjective" "MarketingObjective";
ALTER TABLE "BrandProfile" ADD COLUMN "socialNetworks" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "BrandProfile" ADD COLUMN "mainProducts" TEXT;
ALTER TABLE "BrandProfile" ADD COLUMN "differentiators" TEXT;
