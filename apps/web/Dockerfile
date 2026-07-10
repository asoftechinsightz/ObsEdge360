ARG NEXT_PUBLIC_API_URL=http://localhost:4000

FROM node:20-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY package.json package-lock.json* ./
COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web
RUN npm install --workspace=@opsedge360/web --workspace=@opsedge360/shared-types
RUN npm run build -w @opsedge360/shared-types
RUN npm run build -w @opsedge360/web

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
