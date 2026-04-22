#!/bin/sh
set -e

echo "Running database migrations..."
bunx drizzle-kit migrate
echo "Migrations complete."

exec bun build/index.js
