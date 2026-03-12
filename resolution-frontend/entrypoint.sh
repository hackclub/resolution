#!/bin/sh
set -e

echo "Running database schema push..."
npx drizzle-kit push --force 2>&1
echo "Schema push complete."

exec node build
