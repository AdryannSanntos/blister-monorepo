-- Blister IA domain: company, campaigns, agents, RAG, credits, AI catalog
-- Requires pgvector extension

CREATE EXTENSION IF NOT EXISTS vector;

-- Migrate UserType enum (legacy → Blister)
ALTER TYPE "UserType" RENAME TO "UserType_old";
CREATE TYPE "UserType" AS ENUM ('BUSINESS', 'ADMIN', 'USER');
ALTER TABLE "User" ALTER COLUMN "userType" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "userType" TYPE "UserType" USING (
  CASE "userType"::text
    WHEN 'MARCA' THEN 'BUSINESS'::"UserType"
    WHEN 'NEGOCIO' THEN 'BUSINESS'::"UserType"
    WHEN 'ADMIN' THEN 'ADMIN'::"UserType"
    ELSE 'USER'::"UserType"
  END
);
ALTER TABLE "User" ALTER COLUMN "userType" SET DEFAULT 'USER';
DROP TYPE "UserType_old";

-- Enums
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "CampaignFileType" AS ENUM ('IMAGE', 'TEXT', 'PDF');
CREATE TYPE "CampaignFileStatus" AS ENUM ('PENDING', 'PROCESSING', 'INDEXED', 'FAILED');
CREATE TYPE "ContentPieceStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "ContentPieceFormat" AS ENUM ('INSTAGRAM_SQUARE_1080');
CREATE TYPE "PipelineRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "AgentRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "AgentRunStepStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');
CREATE TYPE "StepResultType" AS ENUM ('CONTINUE', 'PAUSED', 'FAILED', 'COMPLETE');
CREATE TYPE "FeedbackType" AS ENUM ('APPROVED', 'REJECTED', 'EDITED', 'IMPROVE_REQUEST', 'REGENERATED');
CREATE TYPE "CreditLedgerType" AS ENUM ('CREDIT', 'DEBIT', 'ADJUST', 'REFUND');
CREATE TYPE "RagSourceType" AS ENUM ('BRAND_BRAIN', 'CAMPAIGN', 'CAMPAIGN_FILE', 'AGENT_LEARNING', 'APPROVED_PIECE');
CREATE TYPE "RagDocumentStatus" AS ENUM ('PENDING', 'INDEXING', 'INDEXED', 'FAILED');
CREATE TYPE "RagIndexJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- Company / Brand
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "logoStorageKey" TEXT,
    "brandVoice" TEXT NOT NULL,
    "palette" JSONB NOT NULL DEFAULT '[]',
    "typography" TEXT,
    "niche" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- Campaigns
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "context" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignFile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "type" "CampaignFileType" NOT NULL,
    "status" "CampaignFileStatus" NOT NULL DEFAULT 'PENDING',
    "extractedText" TEXT,
    "caption" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignFile_pkey" PRIMARY KEY ("id")
);

-- Orchestration
CREATE TABLE "PipelineRun" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "campaignId" TEXT,
    "triggeredByUserId" TEXT NOT NULL,
    "userInput" TEXT NOT NULL,
    "status" "PipelineRunStatus" NOT NULL DEFAULT 'QUEUED',
    "agentOrder" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "creditCost" DECIMAL(12,4),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "PipelineRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "pipelineRunId" TEXT,
    "campaignId" TEXT,
    "agentId" TEXT NOT NULL,
    "parentRunId" TEXT,
    "feedbackId" TEXT,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'QUEUED',
    "currentStepKey" TEXT,
    "inputPayload" JSONB NOT NULL DEFAULT '{}',
    "outputPayload" JSONB NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "pauseReason" TEXT,
    "pauseFormSchema" JSONB,
    "creditCost" DECIMAL(12,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentRunStep" (
    "id" TEXT NOT NULL,
    "agentRunId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "status" "AgentRunStepStatus" NOT NULL DEFAULT 'PENDING',
    "resultType" "StepResultType",
    "inputPayload" JSONB NOT NULL DEFAULT '{}',
    "outputPayload" JSONB NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "llmModel" TEXT,
    "tokensInput" INTEGER,
    "tokensOutput" INTEGER,
    "creditCost" DECIMAL(12,4),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentRunStep_pkey" PRIMARY KEY ("id")
);

-- Content pieces
CREATE TABLE "ContentPiece" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "campaignId" TEXT,
    "pipelineRunId" TEXT,
    "agentRunId" TEXT,
    "format" "ContentPieceFormat" NOT NULL DEFAULT 'INSTAGRAM_SQUARE_1080',
    "status" "ContentPieceStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "caption" TEXT,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageStorageKey" TEXT,
    "htmlSnapshot" TEXT,
    "creditCost" DECIMAL(12,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    CONSTRAINT "ContentPiece_pkey" PRIMARY KEY ("id")
);

-- Learning
CREATE TABLE "AgentFeedback" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contentPieceId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "feedbackType" "FeedbackType" NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "originalContent" JSONB NOT NULL DEFAULT '{}',
    "editedContent" JSONB,
    "instruction" TEXT,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningSignal" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "signalValue" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearningSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentMemory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "signals" JSONB NOT NULL DEFAULT '[]',
    "lastFeedbackId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
);

-- Credits
CREATE TABLE "CreditBalance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditLedger" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "CreditLedgerType" NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL,
    "balanceAfter" DECIMAL(12,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "agentRunStepId" TEXT,
    "agentRunId" TEXT,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformCreditSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "freeTierAmount" DECIMAL(12,4) NOT NULL DEFAULT 20,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "markupDefault" DECIMAL(5,4) NOT NULL DEFAULT 1.2,
    "minRunCost" DECIMAL(12,4) NOT NULL DEFAULT 0.01,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,
    CONSTRAINT "PlatformCreditSettings_pkey" PRIMARY KEY ("id")
);

-- AI catalog
CREATE TABLE "AiProvider" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiProviderCredential" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiProviderCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiModel" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inputCostPer1k" DECIMAL(12,6) NOT NULL,
    "outputCostPer1k" DECIMAL(12,6) NOT NULL,
    "maxTokens" INTEGER,
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiModel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentModelPolicy" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "markupMultiplier" DECIMAL(5,4) NOT NULL DEFAULT 1.2,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "minCostPerRun" DECIMAL(12,4),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentModelPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PipelineAgentConfig" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "PipelineAgentConfig_pkey" PRIMARY KEY ("id")
);

-- RAG
CREATE TABLE "RagDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "campaignId" TEXT,
    "sourceType" "RagSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT,
    "contentHash" TEXT NOT NULL,
    "status" "RagDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RagDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RagChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "campaignId" TEXT,
    "agentId" TEXT,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RagChunk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RagEmbedding" (
    "id" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "embeddingModel" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL DEFAULT 1536,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RagEmbedding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RagIndexJob" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "documentId" TEXT,
    "status" "RagIndexJobStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RagIndexJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RagPlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "embeddingModelId" TEXT,
    "chunkSize" INTEGER NOT NULL DEFAULT 512,
    "chunkOverlap" INTEGER NOT NULL DEFAULT 64,
    "topK" INTEGER NOT NULL DEFAULT 8,
    "rerankEnabled" BOOLEAN NOT NULL DEFAULT true,
    "captionModelId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RagPlatformSettings_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "Company_ownerUserId_key" ON "Company"("ownerUserId");
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
CREATE INDEX "Company_slug_idx" ON "Company"("slug");
CREATE UNIQUE INDEX "BrandProfile_companyId_key" ON "BrandProfile"("companyId");
CREATE INDEX "Campaign_companyId_idx" ON "Campaign"("companyId");
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");
CREATE INDEX "CampaignFile_companyId_idx" ON "CampaignFile"("companyId");
CREATE INDEX "CampaignFile_campaignId_idx" ON "CampaignFile"("campaignId");
CREATE INDEX "CampaignFile_status_idx" ON "CampaignFile"("status");
CREATE INDEX "PipelineRun_companyId_idx" ON "PipelineRun"("companyId");
CREATE INDEX "PipelineRun_campaignId_idx" ON "PipelineRun"("campaignId");
CREATE INDEX "PipelineRun_status_idx" ON "PipelineRun"("status");
CREATE UNIQUE INDEX "AgentRun_feedbackId_key" ON "AgentRun"("feedbackId");
CREATE INDEX "AgentRun_companyId_idx" ON "AgentRun"("companyId");
CREATE INDEX "AgentRun_pipelineRunId_idx" ON "AgentRun"("pipelineRunId");
CREATE INDEX "AgentRun_agentId_idx" ON "AgentRun"("agentId");
CREATE INDEX "AgentRun_status_idx" ON "AgentRun"("status");
CREATE UNIQUE INDEX "AgentRunStep_agentRunId_stepIndex_key" ON "AgentRunStep"("agentRunId", "stepIndex");
CREATE INDEX "AgentRunStep_agentRunId_idx" ON "AgentRunStep"("agentRunId");
CREATE INDEX "AgentRunStep_status_idx" ON "AgentRunStep"("status");
CREATE INDEX "ContentPiece_companyId_idx" ON "ContentPiece"("companyId");
CREATE INDEX "ContentPiece_campaignId_idx" ON "ContentPiece"("campaignId");
CREATE INDEX "ContentPiece_status_idx" ON "ContentPiece"("status");
CREATE INDEX "ContentPiece_pipelineRunId_idx" ON "ContentPiece"("pipelineRunId");
CREATE UNIQUE INDEX "AgentFeedback_companyId_contentHash_key" ON "AgentFeedback"("companyId", "contentHash");
CREATE INDEX "AgentFeedback_contentPieceId_idx" ON "AgentFeedback"("contentPieceId");
CREATE INDEX "AgentFeedback_agentId_idx" ON "AgentFeedback"("agentId");
CREATE INDEX "AgentFeedback_feedbackType_idx" ON "AgentFeedback"("feedbackType");
CREATE INDEX "LearningSignal_companyId_agentId_idx" ON "LearningSignal"("companyId", "agentId");
CREATE INDEX "LearningSignal_feedbackId_idx" ON "LearningSignal"("feedbackId");
CREATE UNIQUE INDEX "AgentMemory_companyId_agentId_key" ON "AgentMemory"("companyId", "agentId");
CREATE UNIQUE INDEX "CreditBalance_companyId_key" ON "CreditBalance"("companyId");
CREATE INDEX "CreditLedger_companyId_idx" ON "CreditLedger"("companyId");
CREATE INDEX "CreditLedger_createdAt_idx" ON "CreditLedger"("createdAt");
CREATE INDEX "CreditLedger_type_idx" ON "CreditLedger"("type");
CREATE UNIQUE INDEX "AiProvider_slug_key" ON "AiProvider"("slug");
CREATE INDEX "AiProviderCredential_providerId_idx" ON "AiProviderCredential"("providerId");
CREATE UNIQUE INDEX "AiModel_providerId_externalId_key" ON "AiModel"("providerId", "externalId");
CREATE INDEX "AiModel_providerId_idx" ON "AiModel"("providerId");
CREATE UNIQUE INDEX "AgentModelPolicy_agentId_key" ON "AgentModelPolicy"("agentId");
CREATE UNIQUE INDEX "PipelineAgentConfig_agentId_key" ON "PipelineAgentConfig"("agentId");
CREATE INDEX "PipelineAgentConfig_sortOrder_idx" ON "PipelineAgentConfig"("sortOrder");
CREATE UNIQUE INDEX "RagDocument_companyId_sourceType_sourceId_contentHash_key" ON "RagDocument"("companyId", "sourceType", "sourceId", "contentHash");
CREATE INDEX "RagDocument_companyId_idx" ON "RagDocument"("companyId");
CREATE INDEX "RagDocument_campaignId_idx" ON "RagDocument"("campaignId");
CREATE INDEX "RagDocument_sourceType_idx" ON "RagDocument"("sourceType");
CREATE INDEX "RagDocument_status_idx" ON "RagDocument"("status");
CREATE UNIQUE INDEX "RagChunk_documentId_chunkIndex_key" ON "RagChunk"("documentId", "chunkIndex");
CREATE INDEX "RagChunk_companyId_idx" ON "RagChunk"("companyId");
CREATE INDEX "RagChunk_campaignId_idx" ON "RagChunk"("campaignId");
CREATE INDEX "RagChunk_agentId_idx" ON "RagChunk"("agentId");
CREATE UNIQUE INDEX "RagEmbedding_chunkId_key" ON "RagEmbedding"("chunkId");
CREATE INDEX "RagIndexJob_status_scheduledAt_idx" ON "RagIndexJob"("status", "scheduledAt");
CREATE INDEX "RagIndexJob_companyId_idx" ON "RagIndexJob"("companyId");
CREATE UNIQUE INDEX "RagPlatformSettings_embeddingModelId_key" ON "RagPlatformSettings"("embeddingModelId");
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- Foreign keys
ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignFile" ADD CONSTRAINT "CampaignFile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignFile" ADD CONSTRAINT "CampaignFile_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipelineRun" ADD CONSTRAINT "PipelineRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipelineRun" ADD CONSTRAINT "PipelineRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_pipelineRunId_fkey" FOREIGN KEY ("pipelineRunId") REFERENCES "PipelineRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_parentRunId_fkey" FOREIGN KEY ("parentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentRunStep" ADD CONSTRAINT "AgentRunStep_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_pipelineRunId_fkey" FOREIGN KEY ("pipelineRunId") REFERENCES "PipelineRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentFeedback" ADD CONSTRAINT "AgentFeedback_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentFeedback" ADD CONSTRAINT "AgentFeedback_contentPieceId_fkey" FOREIGN KEY ("contentPieceId") REFERENCES "ContentPiece"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentFeedback" ADD CONSTRAINT "AgentFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningSignal" ADD CONSTRAINT "LearningSignal_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "AgentFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditBalance" ADD CONSTRAINT "CreditBalance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_agentRunStepId_fkey" FOREIGN KEY ("agentRunStepId") REFERENCES "AgentRunStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiProviderCredential" ADD CONSTRAINT "AiProviderCredential_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiModel" ADD CONSTRAINT "AiModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentModelPolicy" ADD CONSTRAINT "AgentModelPolicy_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AiModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RagDocument" ADD CONSTRAINT "RagDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RagDocument" ADD CONSTRAINT "RagDocument_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RagChunk" ADD CONSTRAINT "RagChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "RagDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RagEmbedding" ADD CONSTRAINT "RagEmbedding_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "RagChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RagIndexJob" ADD CONSTRAINT "RagIndexJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RagIndexJob" ADD CONSTRAINT "RagIndexJob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "RagDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RagPlatformSettings" ADD CONSTRAINT "RagPlatformSettings_embeddingModelId_fkey" FOREIGN KEY ("embeddingModelId") REFERENCES "AiModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "AgentFeedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;
