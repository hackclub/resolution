#!/bin/sh
set -e

echo "Running database migrations..."
npx drizzle-kit push --force
echo "Migrations complete."

exec node build
