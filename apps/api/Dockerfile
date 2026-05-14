FROM node:22-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/authz/package.json packages/authz/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/configs/package.json packages/configs/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY apps/api apps/api
COPY packages packages

RUN pnpm --filter @company-os/authz build \
  && pnpm --filter @company-os/types build \
  && pnpm --filter @company-os/api prisma:generate

FROM base AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app /app

EXPOSE 3001

CMD ["sh", "-c", "pnpm --filter @company-os/api exec prisma db push && node -r tsconfig-paths/register -r ts-node/register apps/api/src/main.ts"]
