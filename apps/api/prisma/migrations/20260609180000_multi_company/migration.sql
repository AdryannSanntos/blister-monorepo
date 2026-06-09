-- Allow multiple companies per owner

DROP INDEX IF EXISTS "Company_ownerUserId_key";

CREATE INDEX IF NOT EXISTS "Company_ownerUserId_idx" ON "Company"("ownerUserId");
