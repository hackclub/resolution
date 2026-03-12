#!/bin/sh
set -e

echo "DATABASE_URL is set: $([ -n "$DATABASE_URL" ] && echo 'yes' || echo 'NO')"

echo "Running database schema push..."
echo "" | npx drizzle-kit push --force --verbose 2>&1 || echo "WARNING: drizzle-kit push failed with exit code $?"
echo "Schema push complete."

exec node build
