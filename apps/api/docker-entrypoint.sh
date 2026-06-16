#!/bin/sh
set -e

cd /app
. apps/api/scripts/docker-database-url.sh

echo "Applying Prisma schema..."
pnpm --filter @company-os/api exec prisma db push

echo "Starting API..."
exec node apps/api/dist/src/main.js
