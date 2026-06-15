-- AgentRun: support personal-space scoped runs (companyId now optional + personalSpaceId)
ALTER TABLE "AgentRun" ALTER COLUMN "companyId" DROP NOT NULL;
ALTER TABLE "AgentRun" ADD COLUMN "personalSpaceId" TEXT;

CREATE INDEX "AgentRun_personalSpaceId_idx" ON "AgentRun"("personalSpaceId");

ALTER TABLE "AgentRun"
  ADD CONSTRAINT "AgentRun_personalSpaceId_fkey"
  FOREIGN KEY ("personalSpaceId") REFERENCES "PersonalSpace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
