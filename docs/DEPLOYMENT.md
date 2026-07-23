# Deployment

Two deployable units. The recommended production topology is **API on Render** (Docker,
alongside Render Postgres) and **front-end on Vercel**.

---

## 1. Secrets

Generate two different secrets, each at least 32 characters:

```bash
openssl rand -base64 48   # JWT_ACCESS_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET
```

Environment validation runs at boot (`server/src/config/env.ts`) and the process **exits**
with a readable list of problems if anything is missing, too short, or — in production —
if the two secrets are identical. Failing fast at boot is intentional.

---

## 2. API on Render

The repository ships a blueprint at `render.yaml` that provisions the database and the
web service together.

1. **New → Blueprint** in the Render dashboard, point it at the repository.
2. Render creates `cardmaxxing-db` and `cardmaxxing-api`, wires `DATABASE_URL` from the
   database, and generates both JWT secrets.
3. Set the two `sync: false` variables manually:
   - `CORS_ORIGIN` — your Vercel origin, e.g. `https://cardmaxxing.vercel.app`
   - `ANTHROPIC_API_KEY` — optional; leave unset to ship without the AI layer
4. Deploy. `preDeployCommand` runs `prisma migrate deploy` before traffic shifts.
5. Seed once, from the Render shell:

   ```bash
   npx prisma db seed
   ```

`healthCheckPath` is `/health`. `TRUST_PROXY=true` is set so rate limiting and `req.ip`
see the real client address behind Render's proxy.

### The Prisma / OpenSSL gotcha

Prisma ships engine binaries compiled per-platform. On a Debian-slim Node image the
correct target is `debian-openssl-3.0.x`, and OpenSSL must actually be installed. Both are
handled in this repository — `binaryTargets` in `prisma/schema.prisma`, and
`apt-get install openssl` in _both_ stages of `server/Dockerfile`. Omitting either
produces `PrismaClientInitializationError` at boot, which is the single most common way a
Prisma deployment on Render fails.

---

## 3. Front-end on Vercel

1. **Add New → Project**, import the repository.
2. Set **Root Directory** to `web`. Vercel reads `web/vercel.json` for the rest.
3. Add an environment variable:

   ```
   VITE_API_URL = https://cardmaxxing-api.onrender.com/api
   ```

   `VITE_*` variables are inlined at build time, so changing this requires a redeploy.

4. Deploy, then set `CORS_ORIGIN` on Render to the resulting Vercel origin.

Cross-site cookies require `Secure` and `SameSite=None`, which the API sets automatically
when `NODE_ENV=production`. Both sides must be HTTPS — they are on Render and Vercel.

---

## 4. Docker Compose (self-hosted or local)

```bash
cp .env.example .env      # set both JWT secrets
docker compose up --build
docker compose exec api npx prisma db seed
```

| Service | Port | Notes                                                 |
| ------- | ---- | ----------------------------------------------------- |
| `web`   | 8080 | nginx serving the built SPA, proxying `/api` to `api` |
| `api`   | 4000 | Runs `prisma migrate deploy` then starts              |
| `db`    | 5432 | PostgreSQL 16, healthchecked; `api` waits for it      |

The API image is multi-stage: dependencies and the TypeScript build happen in a build
stage, then `npm prune --omit=dev` strips dev dependencies and only `dist/`,
`node_modules/` and `prisma/` are copied into the runtime image. It runs as the
unprivileged `node` user and declares a `HEALTHCHECK` against `/health`.

---

## 5. Migrations in production

```bash
npx prisma migrate deploy    # applies pending migrations, never generates or resets
```

Never run `migrate dev` or `db push` against production — the first can prompt for a
reset, the second skips migration history entirely.

The seed is **idempotent**: it upserts on `slug` and marks cards missing from the
catalogue as `isActive: false` rather than deleting them, so foreign keys from existing
favourites and recommendation history stay intact. It is safe to re-run on every deploy.

---

## 6. Post-deploy checklist

- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] `GET /api/cards` returns a non-empty `items` array (seed ran)
- [ ] Register a user; confirm `cm_access_token` and `cm_refresh_token` are set with
      `HttpOnly`, `Secure` and `SameSite=None`
- [ ] `POST /api/recommendations` returns ranked results
- [ ] Front-end can reach the API — no CORS errors in the browser console
- [ ] `aiAvailable` in `/health` matches whether you intended to enable the AI layer
