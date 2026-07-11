FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-db ./packages/shared-db
COPY packages/shared-logger ./packages/shared-logger
COPY packages/shared-security ./packages/shared-security
COPY packages/cache ./packages/cache
COPY packages/platform-config ./packages/platform-config
COPY apps/api-gateway ./apps/api-gateway
RUN npm install \
    --workspace=@opsedge360/api-gateway \
    --workspace=@opsedge360/shared-types \
    --workspace=@opsedge360/shared-db \
    --workspace=@opsedge360/shared-logger \
    --workspace=@opsedge360/shared-security \
    --workspace=@opsedge360/cache \
    --workspace=@opsedge360/platform-config
RUN npm run build -w @opsedge360/platform-config -w @opsedge360/cache -w @opsedge360/shared-types -w @opsedge360/shared-db -w @opsedge360/shared-logger -w @opsedge360/shared-security
RUN npm run build -w @opsedge360/api-gateway

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api-gateway/dist ./dist
COPY --from=builder /app/apps/api-gateway/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
RUN npm install --omit=dev express
EXPOSE 4000
CMD ["node", "dist/main.js"]
