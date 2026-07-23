# ---------- build ----------
FROM node:22-slim AS build
WORKDIR /app

# Prisma's engines are linked against OpenSSL 3; without it the client fails at boot.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# Drop dev dependencies but keep the generated client.
RUN npm prune --omit=dev

# ---------- runtime ----------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Run unprivileged. node:22-slim already ships a `node` user.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && (npx --yes tsx prisma/seed.ts || echo 'seed skipped/failed, continuing') && node dist/index.js"]
