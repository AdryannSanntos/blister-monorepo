-- Drop MEI/post-first legacy schema (Blister OS cleanup)

ALTER TABLE "AgentRun" DROP CONSTRAINT IF EXISTS "AgentRun_pipelineRunId_fkey";
ALTER TABLE "AgentRun" DROP CONSTRAINT IF EXISTS "AgentRun_campaignId_fkey";
ALTER TABLE "AgentRun" DROP CONSTRAINT IF EXISTS "AgentRun_feedbackId_fkey";
ALTER TABLE "AgentRun" DROP COLUMN IF EXISTS "pipelineRunId";
ALTER TABLE "AgentRun" DROP COLUMN IF EXISTS "campaignId";
ALTER TABLE "AgentRun" DROP COLUMN IF EXISTS "feedbackId";

DELETE FROM "RagDocument"
WHERE "sourceType"::text IN ('BRAND_BRAIN', 'CAMPAIGN', 'CAMPAIGN_FILE', 'APPROVED_PIECE');

ALTER TABLE "RagDocument" DROP CONSTRAINT IF EXISTS "RagDocument_campaignId_fkey";
ALTER TABLE "RagDocument" DROP COLUMN IF EXISTS "campaignId";

ALTER TABLE "RagChunk" DROP COLUMN IF EXISTS "campaignId";

DROP TABLE IF EXISTS "LearningSignal" CASCADE;
DROP TABLE IF EXISTS "AgentFeedback" CASCADE;
DROP TABLE IF EXISTS "ContentPiece" CASCADE;
DROP TABLE IF EXISTS "CampaignFile" CASCADE;
DROP TABLE IF EXISTS "Campaign" CASCADE;
DROP TABLE IF EXISTS "PipelineRun" CASCADE;
DROP TABLE IF EXISTS "AgentMemory" CASCADE;
DROP TABLE IF EXISTS "BrandProfile" CASCADE;

DROP TYPE IF EXISTS "FeedbackType";
DROP TYPE IF EXISTS "ContentPieceStatus";
DROP TYPE IF EXISTS "ContentPieceFormat";
DROP TYPE IF EXISTS "CampaignFileStatus";
DROP TYPE IF EXISTS "CampaignFileType";
DROP TYPE IF EXISTS "CampaignStatus";
DROP TYPE IF EXISTS "PipelineRunStatus";
DROP TYPE IF EXISTS "MarketingObjective";

ALTER TYPE "RagSourceType" RENAME TO "RagSourceType_old";
CREATE TYPE "RagSourceType" AS ENUM ('WORKSPACE_SETTINGS', 'WORKSPACE_FILE', 'AGENT_LEARNING');
ALTER TABLE "RagDocument"
  ALTER COLUMN "sourceType" TYPE "RagSourceType"
  USING ("sourceType"::text::"RagSourceType");
DROP TYPE "RagSourceType_old";
