#!/bin/sh
set -e

# Seed database on first run if it doesn't exist
if [ ! -f "data/family-events.db" ]; then
  echo "First run detected — seeding database..."
  npx tsx scripts/seed.ts
  echo ""
fi

exec "$@"
