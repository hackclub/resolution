#!/bin/sh
set -e

echo "Running database schema push..."
echo "" | npx drizzle-kit push --verbose 2>&1 || echo "WARNING: drizzle-kit push failed with exit code $?"
echo "Schema push complete."

exec node build
