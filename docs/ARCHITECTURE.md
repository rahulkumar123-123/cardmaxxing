# Architecture

## Shape of the system

```
┌──────────────┐      httpOnly cookies      ┌──────────────┐        ┌────────────┐
│  React SPA   │ ─────────────────────────► │  Express API │ ─────► │ PostgreSQL │
│  Vite build  │ ◄───────────────────────── │   + Prisma   │ ◄───── │            │
└──────────────┘        JSON envelope       └──────┬───────┘        └────────────┘
   Vercel / nginx                                  │  optional, explanation only
                                                   ▼
                                          ┌──────────────────┐
                                          │  Anthropic API   │
                                          └──────────────────┘
```

Two independently deployable packages, `server/` and `web/`, each with its own
`package.json` and lockfile. They are deliberately _not_ an npm workspace: Render builds
only `server/` and Vercel builds only `web/`, and separate lockfiles keep those builds
small and reproducible.

## Backend layering

```
routes  →  controller  →  service  →  prisma
   │           │             │
   │           │             └─ business logic, the only layer that touches the database
   │           └─ HTTP concerns only: status codes, cookies, response envelope
   └─ middleware composition: rate limit → validate → auth → handler
```

`src/domain/` holds framework-free types shared by the engine and the API. The
recommendation engine imports nothing from Express or Prisma, which is what makes it
trivially unit-testable.

### Middleware order in `app.ts`

`helmet` → `cors` → `compression` → body parsers (100 kB cap) → `cookie-parser` →
`/health` → rate limiter → routers → `notFoundHandler` → `errorHandler`.

The error handler is the single place that converts anything thrown anywhere into the
response envelope. It translates Prisma's `P2002` / `P2025` / `P2003` into 409 / 404 / 400
and suppresses stack traces and driver internals in production.

## Data model

Six models. `Card` is the read-heavy core; everything else hangs off `User`.

```
User ──< Session                (refresh-token sessions, SHA-256 digests only)
  ├──< Favorite >── Card        (unique on [userId, cardId])
  └──< RecommendationHistory
         └──< RecommendationItem >── Card
```

Design decisions worth calling out:

- **`rewardMultipliers` is JSONB, not a join table.** It is a small, read-only,
  always-loaded-whole map of category → effective rate. A `CardRewardMultiplier` table
  would add a join to the hottest query in the app for no queryability we actually use.
- **`RecommendationHistory.preferences` is a frozen JSON snapshot.** History must remain
  reproducible even after the user's profile changes or the engine's weights are revised —
  hence also the `engineVersion` column.
- **`RecommendationItem.breakdown` stores the per-factor scores.** Recomputing them later
  against a newer catalogue would silently rewrite history.
- **Cards are retired, never deleted.** The seed flips `isActive` to `false` for cards
  dropped from the catalogue, so foreign keys from old history and favourites survive.
- **Indexes** cover every filterable column plus the composite `[isActive, popularity]`
  that backs the default catalogue sort.

## Authentication

Access token (15 min) and refresh token (30 days), both httpOnly, `Secure` and
`SameSite=None` in production so a Vercel front-end can talk to a Render API.

Refresh rotation: on `POST /auth/refresh` the presented session is revoked and a fresh
session issued. Only the SHA-256 digest of each refresh token is persisted, so a database
leak cannot be replayed. Login runs a bcrypt comparison even when the email does not
exist, so response timing does not disclose which accounts are real.

## The recommendation engine

`server/src/modules/recommendations/engine.ts` — a pure function, no I/O, no randomness,
no clock reads.

### Stage 1 — hard filters

Age band, minimum credit score, minimum income (salaried vs self-employed), excluded
issuers, and the fee ceiling implied by `feeTolerance`. `ZERO` tolerance additionally
requires a zero _joining_ fee. Every rejection carries a reason string, returned to the
client so "why isn't card X here?" is always answerable.

### Stage 2 — rupee value estimate

```
annualReward   = (monthlySpend × baseRate  +  min(acceleratedUplift, monthlyCap)) × 12
fuelSaving     = min(fuelSpend × 1%, fuelWaiverMonthlyCap) × 12      [if the user drives]
loungeValue    = domesticVisits × ₹1,000 + internationalVisits × ₹2,500  [if wanted]
effectiveFee   = annualSpend ≥ feeWaiverSpend ? 0 : annualFee
netAnnualValue = annualReward + fuelSaving − effectiveFee
```

Modelling the **monthly cap** on accelerated earnings is what separates this from a naive
multiplier comparison — several headline Indian cards advertise 10X rates that a ₹500-a-month
cap quietly neutralises.

### Stage 3 — ten weighted factors

| Factor                | Base weight | Measures                                                |
| --------------------- | ----------: | ------------------------------------------------------- |
| `rewardValue`         |          26 | Net annual value against a 5%-of-spend benchmark        |
| `categoryFit`         |          20 | Spend-weighted rate across the user's own categories    |
| `feeFit`              |          14 | Effective fee against the user's stated ceiling         |
| `loungeFit`           |          10 | Lounge quota against the stated preference              |
| `eligibilityHeadroom` |           8 | How comfortably the user clears income and score floors |
| `forexFit`            |           6 | Markup on a 0.99%–3.5% scale                            |
| `fuelFit`             |           6 | Surcharge waiver plus fuel category rate                |
| `issuerAffinity`      |           4 | Preferred-issuer match                                  |
| `welcomeValue`        |           3 | Welcome and milestone benefits present                  |
| `reputation`          |           3 | Rating and popularity blend                             |

Each factor produces a raw 0–1 score, multiplied by its weight. **Factors that cannot
apply are zeroed and the rest re-normalised to sum to exactly 100** — otherwise a
non-driver who never flies would see every card capped at 84/100 and the scale would stop
meaning anything.

A mismatched reward currency (wanting cashback, getting points) applies a 0.75 multiplier
to the value-based factors rather than disqualifying the card, since a strong points card
often still beats a weak cashback one.

### Stage 4 — stable ranking

Sort by score, then popularity, then slug. Input ordering cannot affect output — asserted
directly in the test suite.

### The AI boundary

`modules/ai/explainer.ts` receives an _already-decided_ ranking and returns prose. It is
called after `recommend()` has returned, cannot mutate the result, and every failure path
(no API key, non-200, timeout, malformed body) returns `{ explanation: null }` so the API
degrades to the deterministic reasons. The prompt states explicitly that the model must
not reorder or suggest alternatives.

## Frontend

- **Routing** — React Router 6 data router; authenticated routes sit behind a
  `RequireAuth` layout route that waits for session bootstrap before redirecting.
- **State** — Zustand, four small stores: `auth`, `favorites`, `compare` (persisted to
  localStorage), `theme` (persisted, honours `prefers-color-scheme` on first visit).
  Server data is _not_ mirrored into global state; it lives in the `useAsync` hook that
  fetched it.
- **`useAsync`** — derives `loading` from whether the settled result matches the current
  dependency key, rather than setting state inside an effect. Stale responses are
  discarded by key, so out-of-order replies cannot overwrite fresher data.
- **Catalogue filters live in the URL.** `useSearchParams` is the single source of truth,
  which makes every filtered view shareable and back-button correct.
- **Token refresh** — a single Axios response interceptor retries once on 401 and shares
  one in-flight refresh promise across concurrent failures, so a burst of 401s cannot
  stampede the refresh endpoint.
- **Card art** — `imageUrl` when present, otherwise a deterministic CSS-drawn card face
  seeded from the slug, so the grid never renders holes.

## Testing

| Layer  | Tool               | Covers                                                                                                                                                                     |
| ------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine | Vitest             | 28 tests: normalisation, caps, fee waivers, hard filters, weight re-normalisation, determinism, tie-breaking                                                               |
| API    | Vitest + Supertest | 33 tests against the real Express app with an in-memory Prisma double: routing, Zod validation, auth, cookie flags, refresh rotation and replay rejection, error envelopes |
| Schema | Migration          | DDL applied against a live PostgreSQL instance                                                                                                                             |
| Types  | `tsc --noEmit`     | Strict mode, `noUncheckedIndexedAccess`, both packages                                                                                                                     |

## Performance

- `$transaction` batches list + count and the six facet queries into single round trips.
- Vite manual chunks split React, Recharts and Framer Motion so the initial route ships
  ~77 kB gzipped of app code rather than one monolithic bundle.
- Search input is debounced 350 ms.
- nginx serves hashed assets with a one-year immutable cache.
