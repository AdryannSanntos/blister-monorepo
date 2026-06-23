/**
 * @company-os/db — single source of truth for the generated Prisma client.
 *
 * The Prisma schema lives in `apps/api/prisma/schema.prisma` and its generator
 * emits the client into `packages/db/src/generated/client`. Both `apps/api`
 * (the backend shell) and `@company-os/agent-ia-sdk` import the client from
 * here so there is exactly one `PrismaClient` / `Prisma` runtime in the repo.
 *
 * Run `pnpm --dir apps/api prisma:generate` to (re)populate `generated/`.
 */
export * from './generated/client';
