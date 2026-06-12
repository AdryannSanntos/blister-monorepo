-- AlterEnum
ALTER TYPE "MarketplaceItemType" ADD VALUE 'CAPTION_STYLE';

-- CreateTable
CREATE TABLE "AgentWorkspaceSetting" (
    "id" TEXT NOT NULL,
    "personalSpaceId" TEXT,
    "companyId" TEXT,
    "agentId" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentWorkspaceSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentWorkspaceSetting_agentId_idx" ON "AgentWorkspaceSetting"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentWorkspaceSetting_personalSpaceId_agentId_key" ON "AgentWorkspaceSetting"("personalSpaceId", "agentId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentWorkspaceSetting_companyId_agentId_key" ON "AgentWorkspaceSetting"("companyId", "agentId");

-- AddForeignKey
ALTER TABLE "AgentWorkspaceSetting" ADD CONSTRAINT "AgentWorkspaceSetting_personalSpaceId_fkey" FOREIGN KEY ("personalSpaceId") REFERENCES "PersonalSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentWorkspaceSetting" ADD CONSTRAINT "AgentWorkspaceSetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
