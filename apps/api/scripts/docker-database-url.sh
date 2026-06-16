#!/bin/sh
# Builds DATABASE_URL from POSTGRES_* when not already set (Docker / EasyPanel).

if [ -z "${DATABASE_URL:-}" ]; then
  ENCODED_PASSWORD="$(node -e "console.log(encodeURIComponent(process.env.POSTGRES_PASSWORD || 'blister'))")"
  export DATABASE_URL="postgresql://${POSTGRES_USER:-blister}:${ENCODED_PASSWORD}@postgres:5432/${POSTGRES_DB:-blister}?schema=public"
fi
