import { PrismaClient } from '../../src/generated/prisma';

let prismaInstance: PrismaClient | null = null;

export function getTestDatabaseUrl(): string {
  return process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL ?? '';
}

export async function getTestPrisma(): Promise<PrismaClient> {
  if (prismaInstance) {
    return prismaInstance;
  }

  const databaseUrl = getTestDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL_TEST or DATABASE_URL must be set for integration tests',
    );
  }

  prismaInstance = new PrismaClient({
    datasourceUrl: databaseUrl,
    log: process.env.DEBUG_PRISMA ? ['query', 'error', 'warn'] : ['error'],
  });

  await prismaInstance.$connect();
  return prismaInstance;
}

export async function cleanupTestDatabase(): Promise<void> {
  const prisma = await getTestPrisma();

  await prisma.$transaction([
    prisma.creditLedger.deleteMany(),
    prisma.agentRunStep.deleteMany(),
    prisma.agentRun.deleteMany(),
    prisma.ragEmbedding.deleteMany(),
    prisma.ragChunk.deleteMany(),
    prisma.ragDocument.deleteMany(),
    prisma.ragIndexJob.deleteMany(),
    prisma.creditBalance.deleteMany(),
    prisma.brandProfile.deleteMany(),
    prisma.userRoleAssignment.deleteMany(),
    prisma.company.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export async function disconnectTestDatabase(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

export async function runMigrations(): Promise<void> {
  const { execSync } = await import('node:child_process');
  const databaseUrl = getTestDatabaseUrl();

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
    cwd: process.cwd(),
  });
}
