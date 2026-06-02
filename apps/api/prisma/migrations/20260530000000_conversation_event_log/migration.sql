-- CreateTable
CREATE TABLE "ConversationEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessageProjection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "text" TEXT NOT NULL DEFAULT '',
    "citations" JSONB NOT NULL DEFAULT '[]',
    "isStreaming" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isFailed" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationMessageProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationToolCallProjection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "toolCallId" TEXT NOT NULL,
    "groupId" TEXT,
    "toolName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inputPayload" JSONB NOT NULL DEFAULT '{}',
    "outputPayload" JSONB,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationToolCallProjection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationEvent_messageId_sequence_idx" ON "ConversationEvent"("messageId", "sequence");

-- CreateIndex
CREATE INDEX "ConversationEvent_organizationId_threadId_idx" ON "ConversationEvent"("organizationId", "threadId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationEvent_threadId_sequence_key" ON "ConversationEvent"("threadId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationEvent_threadId_idempotencyKey_key" ON "ConversationEvent"("threadId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationMessageProjection_messageId_key" ON "ConversationMessageProjection"("messageId");

-- CreateIndex
CREATE INDEX "ConversationMessageProjection_organizationId_threadId_idx" ON "ConversationMessageProjection"("organizationId", "threadId");

-- CreateIndex
CREATE INDEX "ConversationMessageProjection_threadId_updatedAt_idx" ON "ConversationMessageProjection"("threadId", "updatedAt");

-- CreateIndex
CREATE INDEX "ConversationToolCallProjection_organizationId_threadId_idx" ON "ConversationToolCallProjection"("organizationId", "threadId");

-- CreateIndex
CREATE INDEX "ConversationToolCallProjection_messageId_displayOrder_idx" ON "ConversationToolCallProjection"("messageId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationToolCallProjection_messageId_toolCallId_key" ON "ConversationToolCallProjection"("messageId", "toolCallId");

-- AddForeignKey
ALTER TABLE "ConversationEvent" ADD CONSTRAINT "ConversationEvent_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AgentChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationEvent" ADD CONSTRAINT "ConversationEvent_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AgentChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessageProjection" ADD CONSTRAINT "ConversationMessageProjection_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AgentChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessageProjection" ADD CONSTRAINT "ConversationMessageProjection_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AgentChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationToolCallProjection" ADD CONSTRAINT "ConversationToolCallProjection_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AgentChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationToolCallProjection" ADD CONSTRAINT "ConversationToolCallProjection_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AgentChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

