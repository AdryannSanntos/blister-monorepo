-- CreateTable
CREATE TABLE "AgentStepModelPolicy" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentStepModelPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentStepModelPolicy_agentId_idx" ON "AgentStepModelPolicy"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentStepModelPolicy_agentId_stepKey_key" ON "AgentStepModelPolicy"("agentId", "stepKey");

-- AddForeignKey
ALTER TABLE "AgentStepModelPolicy" ADD CONSTRAINT "AgentStepModelPolicy_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AiModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
