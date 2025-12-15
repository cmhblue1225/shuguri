# ========================================
# Shuguridan API - Hono Dockerfile
# Optimized for Railway deployment
# ========================================

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./
COPY turbo.json ./

# Copy workspace package files
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies
RUN npm ci

# Build stage
FROM base AS builder
WORKDIR /app

# Copy installed dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules 2>/dev/null || true
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true

# Copy source files
COPY . .

# Build shared package first
RUN npm run build --workspace=@shuguridan/shared || true

# Build the API
ENV NODE_ENV=production
RUN npm run build --workspace=@shuguridan/api

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

# Copy necessary files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Install production dependencies only
RUN npm ci --omit=dev --workspace=@shuguridan/api --workspace=@shuguridan/shared

# Change ownership
RUN chown -R hono:nodejs /app

USER hono

EXPOSE 3001

ENV PORT=3001

# Start the server
CMD ["node", "apps/api/dist/index.js"]
