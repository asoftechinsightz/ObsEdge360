# AsoftechInsightz Marketing Website v2.0
# Build: docker build -t asoftech-marketing -f apps/marketing/Dockerfile .
# Run:  docker run -p 3010:3010 asoftech-marketing

FROM node:20-alpine AS deps
WORKDIR /app
COPY apps/marketing/package.json ./
RUN npm install --omit=dev=false

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/marketing/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3010
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3010
CMD ["node", "server.js"]
