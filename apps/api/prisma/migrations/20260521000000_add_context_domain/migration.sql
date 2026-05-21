-- CreateTable
CREATE TABLE "ContextSource" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceKind" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "objectKey" TEXT,
    "publicUrl" TEXT,
    "pipelineStatus" TEXT NOT NULL DEFAULT 'pending',
    "pipelineError" TEXT,
    "extractedContent" TEXT,
    "normalizedContent" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContextSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContextArtifact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "objectKey" TEXT,
    "publicUrl" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'idle',
    "syncedAt" TIMESTAMP(3),
    "syncError" TEXT,
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContextArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContextSource_organizationId_updatedAt_idx" ON "ContextSource"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "ContextSource_organizationId_pipelineStatus_idx" ON "ContextSource"("organizationId", "pipelineStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ContextArtifact_organizationId_key" ON "ContextArtifact"("organizationId");

-- AddForeignKey
ALTER TABLE "ContextSource" ADD CONSTRAINT "ContextSource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContextArtifact" ADD CONSTRAINT "ContextArtifact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
