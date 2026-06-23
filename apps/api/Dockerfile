FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat openssl

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/agent-ia-sdk/package.json packages/agent-ia-sdk/package.json
COPY packages/authz/package.json packages/authz/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/configs/package.json packages/configs/package.json

# postinstall references apps/api/scripts/* which is not copied yet
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build

COPY apps/api apps/api
COPY packages packages

RUN node apps/api/scripts/ensure-ffmpeg-static.cjs \
  && pnpm --filter @company-os/authz build \
  && pnpm --filter @company-os/types build \
  && pnpm --filter @company-os/agent-ia-sdk build \
  && pnpm --filter @company-os/api prisma:generate \
  && pnpm --filter @company-os/api build

FROM base AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app /app
COPY apps/api/docker-entrypoint.sh apps/api/docker-entrypoint.sh
COPY apps/api/docker-seed.sh apps/api/docker-seed.sh
COPY apps/api/scripts/docker-database-url.sh apps/api/scripts/docker-database-url.sh
RUN chmod +x apps/api/docker-entrypoint.sh apps/api/docker-seed.sh

EXPOSE 3001

CMD ["apps/api/docker-entrypoint.sh"]
