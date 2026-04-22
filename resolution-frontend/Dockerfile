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

# Copy the built application from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# Copy drizzle config, schema, and migrations for drizzle-kit migrate
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src/lib/server/db/schema.ts ./src/lib/server/db/schema.ts
COPY --from=builder /app/drizzle ./drizzle

# Install drizzle-kit so entrypoint can run `drizzle-kit migrate` at startup
RUN npm install --no-save drizzle-kit@0.31.8

# Copy entrypoint script
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENV NODE_ENV=production
# Increase body size limit for image uploads (default 512K is too small)
ENV BODY_SIZE_LIMIT=10M

CMD ["./entrypoint.sh"]
