-- AlterTable
ALTER TABLE "AgentRun" ADD COLUMN "rootRunId" TEXT,
ADD COLUMN "parentRunId" TEXT,
ADD COLUMN "parentStepId" TEXT,
ADD COLUMN "depth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "currentBlockId" TEXT,
ADD COLUMN "currentBlockType" TEXT,
ADD COLUMN "waitingReason" TEXT,
ADD COLUMN "resumeStatus" TEXT;

-- AlterTable
ALTER TABLE "AgentRunStep" ADD COLUMN "sequence" INTEGER,
ADD COLUMN "branchKey" TEXT,
ADD COLUMN "inputType" TEXT,
ADD COLUMN "outputType" TEXT,
ADD COLUMN "statePayload" JSONB,
ADD COLUMN "uiOutputPayload" JSONB;

-- CreateTable
CREATE TABLE "AgentContextProfile" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "instructions" TEXT,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentContextProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentContextFile" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "publicUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentContextFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentContextReference" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentContextReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRunContextSnapshot" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "layers" JSONB NOT NULL DEFAULT '{}',
    "resolvedSummary" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRunContextSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRunContextSnapshotItem" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "label" TEXT NOT NULL,
    "content" TEXT,
    "summary" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRunContextSnapshotItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRunSuspension" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolvedPayload" JSONB NOT NULL DEFAULT '{}',
    "roundNumber" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRunSuspension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRunSuspensionResponse" (
    "id" TEXT NOT NULL,
    "suspensionId" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "roundNumber" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "answeredById" TEXT NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRunSuspensionResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentContextProfile_agentId_key" ON "AgentContextProfile"("agentId");

-- CreateIndex
CREATE INDEX "AgentContextFile_profileId_idx" ON "AgentContextFile"("profileId");

-- CreateIndex
CREATE INDEX "AgentContextFile_profileId_status_idx" ON "AgentContextFile"("profileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AgentContextReference_profileId_sourceType_sourceId_key" ON "AgentContextReference"("profileId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "AgentContextReference_profileId_idx" ON "AgentContextReference"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentRunContextSnapshot_runId_key" ON "AgentRunContextSnapshot"("runId");

-- CreateIndex
CREATE INDEX "AgentRunContextSnapshotItem_snapshotId_idx" ON "AgentRunContextSnapshotItem"("snapshotId");

-- CreateIndex
CREATE INDEX "AgentRunContextSnapshotItem_sourceType_sourceId_idx" ON "AgentRunContextSnapshotItem"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "AgentRunSuspension_runId_status_idx" ON "AgentRunSuspension"("runId", "status");

-- CreateIndex
CREATE INDEX "AgentRunSuspension_stepId_idx" ON "AgentRunSuspension"("stepId");

-- CreateIndex
CREATE INDEX "AgentRunSuspensionResponse_suspensionId_idx" ON "AgentRunSuspensionResponse"("suspensionId");

-- CreateIndex
CREATE INDEX "AgentRunSuspensionResponse_answeredById_idx" ON "AgentRunSuspensionResponse"("answeredById");

-- CreateIndex
CREATE INDEX "AgentRun_rootRunId_idx" ON "AgentRun"("rootRunId");

-- CreateIndex
CREATE INDEX "AgentRun_parentRunId_idx" ON "AgentRun"("parentRunId");

-- CreateIndex
CREATE INDEX "AgentRun_parentStepId_idx" ON "AgentRun"("parentStepId");

-- CreateIndex
CREATE INDEX "AgentRunStep_runId_sequence_idx" ON "AgentRunStep"("runId", "sequence");

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_rootRunId_fkey" FOREIGN KEY ("rootRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_parentRunId_fkey" FOREIGN KEY ("parentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_parentStepId_fkey" FOREIGN KEY ("parentStepId") REFERENCES "AgentRunStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentContextProfile" ADD CONSTRAINT "AgentContextProfile_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "CompanyAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentContextFile" ADD CONSTRAINT "AgentContextFile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AgentContextProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentContextReference" ADD CONSTRAINT "AgentContextReference_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AgentContextProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRunContextSnapshot" ADD CONSTRAINT "AgentRunContextSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRunContextSnapshotItem" ADD CONSTRAINT "AgentRunContextSnapshotItem_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "AgentRunContextSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRunSuspension" ADD CONSTRAINT "AgentRunSuspension_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRunSuspension" ADD CONSTRAINT "AgentRunSuspension_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "AgentRunStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRunSuspensionResponse" ADD CONSTRAINT "AgentRunSuspensionResponse_suspensionId_fkey" FOREIGN KEY ("suspensionId") REFERENCES "AgentRunSuspension"("id") ON DELETE CASCADE ON UPDATE CASCADE;
