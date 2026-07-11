import { PrismaClient } from '@company-os/db';

const prisma = new PrismaClient();

try {
  const before = await prisma.$queryRaw`
    SELECT
      COUNT(*) AS count,
      COALESCE(MAX(octet_length("outputPayload"::text)), 0) AS max_bytes
    FROM "AgentRun"
    WHERE "outputPayload" ? '_originalOutput'
  `;
  console.log('runs with _originalOutput before:', before);

  const updated = await prisma.$executeRaw`
    UPDATE "AgentRun"
    SET "outputPayload" = "outputPayload" - '_originalOutput',
        "updatedAt" = NOW()
    WHERE "outputPayload" ? '_originalOutput'
  `;
  console.log('rows updated:', updated);

  const after = await prisma.$queryRaw`
    SELECT
      COUNT(*) AS count,
      COALESCE(MAX(octet_length("outputPayload"::text)), 0) AS max_bytes
    FROM "AgentRun"
  `;
  console.log('all runs after cleanup:', after);
} finally {
  await prisma.$disconnect();
}
