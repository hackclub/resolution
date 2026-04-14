# Stage 1: Build with bun
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

# Install all dependencies
RUN npm install

COPY . .
RUN bun run build

# Stage 2: Runtime image
FROM oven/bun:1-alpine
WORKDIR /app

# App artifacts
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock

# Drizzle files needed for runtime schema push
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src/lib/server/db/schema.ts ./src/lib/server/db/schema.ts

EXPOSE 3000
ENV NODE_ENV=production
ENV BODY_SIZE_LIMIT=10M

CMD ["sh", "-c", "bunx drizzle-kit push && bun build/index.js"]
