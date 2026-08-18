FROM node:20-slim AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install --global pnpm@10.14.0 && pnpm install --frozen-lockfile --prod

FROM node:20-slim AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install --global pnpm@10.14.0 && pnpm install --frozen-lockfile
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN pnpm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Next.js standalone output is self-contained
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT=3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', r => process.exit(r.statusCode === 200 ? 0 : 1))"
CMD ["node", "server.js"]
