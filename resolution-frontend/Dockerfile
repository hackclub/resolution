# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and configuration files
COPY package.json package-lock.json* svelte.config.js vite.config.ts* tsconfig.json* ./

# Install all dependencies
RUN npm ci --ignore-scripts

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Prune dev dependencies to reduce image size for the next stage
RUN npm prune --production

# Stage 2: Create the production image
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies (if any specific syste libraries needed, typically none for pure node)

# Copy the built application from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# Copy drizzle config and schema for drizzle-kit push
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src/lib/server/db/schema.ts ./src/lib/server/db/schema.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Install drizzle-kit locally so we don't rely on npx fetching it at runtime
RUN npm install --no-save drizzle-kit

# Copy drizzle files needed for push
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src/lib/server/db/schema.ts ./src/lib/server/db/schema.ts

# Install drizzle-kit for runtime schema push (pruned as devDependency)
RUN npm install drizzle-kit@0.31.8

# Copy entrypoint script
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Expose the port the app runs on (SvelteKit node adapter starts on 3000 by default)
EXPOSE 3000

# Set Node environment to production
ENV NODE_ENV=production
# Increase body size limit for image uploads (default 512K is too small)
ENV BODY_SIZE_LIMIT=10M

# Start the application with migrations
CMD ["./entrypoint.sh"]
