#!/bin/sh
set -e

cd /app
. apps/api/scripts/docker-database-url.sh

echo "Seeding database at ${POSTGRES_DB:-blister}..."
exec pnpm --filter @company-os/api db:seed
