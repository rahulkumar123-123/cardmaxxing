# PROJECT_STATE

Living status document. Read this first when resuming work.

**Last updated:** 2026-07-20 · **Engine version:** 1.0.0

---

## 1. Current status

The application is feature-complete against the original brief. Both packages build,
typecheck and lint clean; 61 automated tests pass.

| Area                                                            | Status |
| --------------------------------------------------------------- | ------ |
| Monorepo, tooling, CI                                           | Done   |
| Prisma schema + initial migration                               | Done   |
| Card catalogue (73 cards, 15 issuers)                           | Done   |
| Recommendation engine + tests                                   | Done   |
| Backend API (auth, cards, favourites, recommendations, history) | Done   |
| Optional AI explanation layer                                   | Done   |
| Frontend (11 routes, dark mode, responsive)                     | Done   |
| Docker, Render, Vercel configs                                  | Done   |
| Documentation                                                   | Done   |

---

## 2. Verification state — read this carefully

Everything below was **executed**, not assumed:

| Check                                            | Result                                                      |
| ------------------------------------------------ | ----------------------------------------------------------- |
| `tsc --noEmit` (server, strict)                  | Clean                                                       |
| `tsc --noEmit` (web, strict)                     | Clean                                                       |
| `eslint .` (whole repo, `--max-warnings=0`)      | Clean                                                       |
| `vitest run` (server)                            | 61 passed — 28 engine, 33 API                               |
| `vite build` (web production)                    | Success, ~77 kB gzipped app chunk                           |
| `tsc -p tsconfig.build.json` (server production) | Success                                                     |
| Initial migration applied to live PostgreSQL 16  | 6 tables, 23 indexes, 6 FKs created                         |
| All 73 seed cards inserted into the real schema  | Success — validates every column type, enum and array field |
| Engine run against the full seeded catalogue     | Sensible top-3 across 4 realistic user scenarios            |

### What has NOT been verified end-to-end

The environment this was built in blocks `binaries.prisma.sh`, so the **Prisma CLI could
never run**. Consequences:

1. **`prisma generate` has not been run against this schema by the normal path.** To make
   the backend typecheckable, the client's _type_ output was reproduced using Prisma's
   WASM schema engine (`getDMMF` + `dmmfToTypes`). Those types are what `tsc` validated
   against, and they are generated from this exact `schema.prisma` — but they are not
   byte-identical to a real `prisma generate` run.
2. **`prisma migrate dev` has not generated the migration.** `prisma/migrations/
20260720000000_init/migration.sql` was hand-authored to match the schema, then applied
   successfully to a live PostgreSQL 16 instance. It is valid SQL that produces the right
   objects. It has _not_ been diffed by Prisma against the schema.
3. **The 33 API tests run against an in-memory Prisma double, not PostgreSQL.** They prove
   routing, validation, auth, cookie flags, refresh rotation and error handling. They do
   **not** prove that the Prisma query shapes in the service layer execute correctly.

### First thing to do on a normal machine

```bash
npm run install:all
npm run db:generate     # real prisma generate
npm run typecheck       # confirm against the real client types
npx prisma migrate dev --name init   # confirm the hand-written migration matches
npm run db:seed
npm test
npm run dev             # smoke-test the app in a browser
```

Expect possible small fixes in `server/src/modules/*/service.ts` — the Prisma query shapes
there are the least-proven code in the repository. If `migrate dev` reports drift, trust
Prisma and regenerate the migration.

---

## 3. Architecture summary

Two independently deployable packages (`server/`, `web/`), deliberately not an npm
workspace so Render and Vercel each build only what they need.

Backend layering: `routes → controller → service → prisma`, with `src/domain/` holding
framework-free shared types. The recommendation engine imports nothing from Express or
Prisma.

See `docs/ARCHITECTURE.md` for the full design.

---

## 4. Data model

`User`, `Session`, `Card`, `Favorite`, `RecommendationHistory`, `RecommendationItem`.
Five enums: `Role`, `CardNetwork`, `CardCategory`, `CardTier`, `RewardType`.

Key decisions: `rewardMultipliers` as JSONB (small, always read whole); preferences and
score breakdowns frozen as JSON in history so past runs stay reproducible; cards retired
via `isActive` rather than deleted so foreign keys survive.

---

## 5. Routes

**Frontend** — `/`, `/cards`, `/cards/:slug`, `/compare`, `/recommend`, `/login`,
`/register`, and behind auth: `/dashboard`, `/favorites`, `/history`. Plus a 404.

**API** — `/health`; `/api/auth/*` (register, login, refresh, logout, logout-all, me);
`/api/cards` (list, facets, compare, by-slug); `/api/recommendations` (POST, engine);
`/api/favorites`; `/api/history`. Full detail in `docs/API.md`.

---

## 6. Key design decisions

- **The engine is a pure function.** No AI, no randomness, no I/O. Same inputs always
  produce byte-identical output; asserted in tests.
- **AI is strictly downstream.** `explainer.ts` receives a decided ranking and returns
  prose. Every failure path returns `null` and the API degrades to deterministic reasons.
- **Weights re-normalise to 100.** Factors that cannot apply to a user are dropped and the
  rest rescaled, so scores stay comparable across different user profiles.
- **Monthly reward caps are modelled.** This is what stops headline 10X rates from
  dominating the ranking when a ₹500/month cap neutralises them.
- **Refresh tokens rotate and are stored as digests only.**
- **Catalogue filter state lives in the URL**, making filtered views shareable.

---

## 7. Known issues and limitations

1. **Card artwork.** Every `imageUrl` is `null`; the UI falls back to a deterministic
   CSS-drawn card face. The Cloudflare R2 pipeline discussed earlier is not built.
2. **Catalogue data is indicative.** Figures are modelled on publicly advertised terms and
   will drift from reality. There is no refresh mechanism — no admin UI, no scraper.
3. **No admin interface.** The `ADMIN` role and `requireAdmin` middleware exist but no
   route uses them. Catalogue changes go through the seed file.
4. **Lounge value is a fixed notional** (₹1,000 domestic / ₹2,500 international per visit)
   rather than something the user can tune.
5. **Rate limiting is in-memory.** Fine for a single instance; multi-instance deployments
   would need a Redis store.
6. **No refresh-token reuse detection.** A rotated token is rejected, but a detected
   replay does not revoke the whole session family.
7. **Frontend has no component tests.** Vitest and Testing Library are installed and
   configured; no specs written yet.
8. **`spendSplit` sliders can total under 100%** — the engine normalises, but the UI does
   not nudge the user toward 100.

---

## 8. Roadmap

**Next** — verify against a real `prisma generate` (section 2); add frontend component
tests; wire up card artwork via R2.

**Then** — admin CRUD for the catalogue behind `requireAdmin`; refresh-token reuse
detection; Redis-backed rate limiting; a "why not this card?" view built on the `rejected`
array the engine already returns.

**Later** — user-tunable factor weights; alerts when a saved card's terms change;
issuer-provided data feeds.

---

## 9. Environment variables

Documented in full in `.env.example`. Required: `DATABASE_URL`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET` (≥32 chars, must differ in production). Optional but important:
`CORS_ORIGIN`, `TRUST_PROXY`, `ANTHROPIC_API_KEY`, `VITE_API_URL`.

---

## 10. Assumptions made

- Effective _percentage value back_ is the right common unit for comparing points, miles
  and cashback. Points-to-rupee conversions are baked into the seed data rather than
  modelled per redemption path.
- A 5% effective return on total spend is treated as a best-in-market benchmark for
  normalising the `rewardValue` factor.
- Fee waiver thresholds are assumed met purely from the user's stated card spend.
- Users are assumed to hold one primary card; the engine does not optimise a portfolio.
