-- AlterTable: agent-level tool allowlist for the conversational chat runtime
ALTER TABLE "CompanyAgent" ADD COLUMN "allowedTools" JSONB NOT NULL DEFAULT '[]';

-- CreateTable: operational audit log for conversational tool calls
CREATE TABLE "AgentChatToolCall" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inputPayload" JSONB NOT NULL,
    "outputPayload" JSONB,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentChatToolCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentChatToolCall_organizationId_agentId_createdAt_idx" ON "AgentChatToolCall"("organizationId", "agentId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentChatToolCall_threadId_createdAt_idx" ON "AgentChatToolCall"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentChatToolCall_messageId_idx" ON "AgentChatToolCall"("messageId");

-- AddForeignKey
ALTER TABLE "AgentChatToolCall" ADD CONSTRAINT "AgentChatToolCall_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "CompanyAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentChatToolCall" ADD CONSTRAINT "AgentChatToolCall_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AgentChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentChatToolCall" ADD CONSTRAINT "AgentChatToolCall_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AgentChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
