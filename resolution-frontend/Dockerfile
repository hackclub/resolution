# Stage 1: Build the application
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package.json and configuration files
COPY package.json bun.lock svelte.config.js vite.config.ts* tsconfig.json* ./

# Install all dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the application
RUN bun run build

# Stage 2: Create the production image
FROM oven/bun:1-alpine

WORKDIR /app

# Copy the built application from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose the port the app runs on (SvelteKit node adapter starts on 3000 by default)
EXPOSE 3000

# Set Node environment to production
ENV NODE_ENV=production

# Start the application
CMD ["bun", "build"]
