#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  ENCODED_PASSWORD="$(node -e "console.log(encodeURIComponent(process.env.POSTGRES_PASSWORD || 'blister'))")"
  export DATABASE_URL="postgresql://${POSTGRES_USER:-blister}:${ENCODED_PASSWORD}@postgres:5432/${POSTGRES_DB:-blister}?schema=public"
fi

echo "Applying Prisma schema..."
pnpm --filter @company-os/api exec prisma db push

echo "Starting API..."
exec node apps/api/dist/src/main.js
