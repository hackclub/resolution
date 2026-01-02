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

# Expose the port the app runs on (SvelteKit node adapter starts on 3000 by default)
EXPOSE 3000

# Set Node environment to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "build"]
