# Multi-stage production Dockerfile for 100% DESIGN Studio OS
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm install

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npx prisma generate
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN apk add --no-cache openssl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create required storage and Next.js cache directories
RUN mkdir -p /app/storage/uploads /app/.next/cache/images && \
    chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Ensure full ownership of .next and storage for nextjs user
RUN chown -R nextjs:nodejs /app/.next /app/storage && \
    chmod -R 775 /app/.next /app/storage

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run start"]
