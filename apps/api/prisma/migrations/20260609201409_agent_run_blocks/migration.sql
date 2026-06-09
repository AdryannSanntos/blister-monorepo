-- CreateTable
CREATE TABLE "AgentRunBlock" (
    "id" TEXT NOT NULL,
    "agentRunId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "blockType" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "label" TEXT,
    "text" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "stepKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'streaming',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRunBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentRunBlock_agentRunId_idx" ON "AgentRunBlock"("agentRunId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentRunBlock_agentRunId_messageId_index_key" ON "AgentRunBlock"("agentRunId", "messageId", "index");

-- AddForeignKey
ALTER TABLE "AgentRunBlock" ADD CONSTRAINT "AgentRunBlock_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
