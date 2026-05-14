FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/authz/package.json packages/authz/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/configs/package.json packages/configs/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY apps/web apps/web
COPY packages packages

RUN pnpm --filter @company-os/authz build \
  && pnpm --filter @company-os/types build \
  && pnpm --filter @company-os/web build

FROM base AS runner

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV PORT=3000

COPY --from=build /app /app

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["pnpm", "start"]
