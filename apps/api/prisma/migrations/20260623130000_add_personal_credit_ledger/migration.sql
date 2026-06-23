-- Personal-space mirror of CreditLedger (company-scoped).
CREATE TABLE "PersonalCreditLedger" (
    "id" TEXT NOT NULL,
    "personalSpaceId" TEXT NOT NULL,
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

    CONSTRAINT "PersonalCreditLedger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PersonalCreditLedger_personalSpaceId_idx" ON "PersonalCreditLedger"("personalSpaceId");
CREATE INDEX "PersonalCreditLedger_createdAt_idx" ON "PersonalCreditLedger"("createdAt");
CREATE INDEX "PersonalCreditLedger_type_idx" ON "PersonalCreditLedger"("type");

ALTER TABLE "PersonalCreditLedger" ADD CONSTRAINT "PersonalCreditLedger_personalSpaceId_fkey" FOREIGN KEY ("personalSpaceId") REFERENCES "PersonalSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalCreditLedger" ADD CONSTRAINT "PersonalCreditLedger_agentRunStepId_fkey" FOREIGN KEY ("agentRunStepId") REFERENCES "AgentRunStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PersonalCreditLedger" ADD CONSTRAINT "PersonalCreditLedger_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
