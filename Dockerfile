FROM node:20-alpine AS base

# -- Dependencies --
FROM base AS deps
RUN apk add --no-cache python3 make g++ vips-dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# -- Build --
FROM base AS build
RUN apk add --no-cache python3 make g++ vips-dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# -- Runner --
FROM base AS runner
RUN apk add --no-cache vips-dev
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# Seed script + dependencies for first-run seeding
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=build /app/node_modules/bindings ./node_modules/bindings
COPY --from=build /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
COPY --from=build /app/node_modules/prebuild-install ./node_modules/prebuild-install
COPY --from=build /app/node_modules/bcrypt ./node_modules/bcrypt
COPY --from=build /app/node_modules/nanoid ./node_modules/nanoid
COPY --from=build /app/node_modules/tsx ./node_modules/tsx

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

RUN mkdir -p data uploads/photos && chown -R nextjs:nodejs data uploads

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
