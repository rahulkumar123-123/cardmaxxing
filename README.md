# CardMaxxing

**An India-specific credit card discovery, comparison and recommendation platform.**

Most Indian card comparison sites rank on affiliate commission. CardMaxxing ranks on
arithmetic — a deterministic weighted-scoring engine estimates what each card is actually
worth to _you_ in rupees per year, and shows its full working.

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18-4F46E5" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.7-4F46E5" />
  <img alt="Node" src="https://img.shields.io/badge/Node-22-4F46E5" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-6-4F46E5" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4F46E5" />
</p>

---

## Why it exists

Picking a credit card in India means reconciling reward multipliers, monthly caps, fee
waiver thresholds, lounge quotas, forex markups and eligibility floors — across ~70 cards
whose terms change every quarter. That is arithmetic, not judgement. So CardMaxxing does
the arithmetic and shows it.

**The recommendation engine contains no AI.** It is a pure function: the same preferences
and the same catalogue always produce byte-identical output. An optional Claude layer
_explains_ the ranking in plain English after the fact, and is disabled entirely when no
API key is present. It can never select, reorder or filter a card.

---

## Features

|               |                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Discover**  | ~70 seeded Indian cards across 15 issuers, with faceted filters on fee, issuer, tier, category, lounge access and fuel benefits |
| **Search**    | Debounced full-text search across card name, issuer, summary and tags                                                           |
| **Recommend** | 10-factor weighted scoring with a full per-factor breakdown and estimated annual rupee value                                    |
| **Compare**   | Up to 4 cards side by side, with the better value in each row highlighted automatically                                         |
| **Save**      | Favourites with optimistic UI updates                                                                                           |
| **History**   | Every recommendation run stored with the exact preferences that produced it                                                     |
| **Explain**   | Optional AI-written explanation of the deterministic result                                                                     |

---

## Tech stack

**Frontend** — React 18, Vite 6, TypeScript (strict), Tailwind CSS, React Router 6,
Zustand, React Hook Form + Zod, Axios, Framer Motion, Recharts, Lucide.

**Backend** — Node 22, Express 4, TypeScript (strict), Prisma 6, PostgreSQL 16,
JWT access + rotating refresh tokens in httpOnly cookies, Helmet, bcrypt, rate limiting,
compression, Zod validation on every route.

**Tooling** — ESLint 9 (flat config), Prettier, Husky + lint-staged, Vitest, Supertest,
GitHub Actions, Docker, Render, Vercel.

---

## Quick start

### Prerequisites

Node 22+, and either Docker (easiest) or a local PostgreSQL 16 instance.

### Option A — Docker (whole stack)

```bash
cp .env.example .env
# Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET — compose refuses to start without them.
# Generate each with: openssl rand -base64 48

docker compose up --build
docker compose exec api npx prisma db seed   # one-off: load the card catalogue
```

Front-end on <http://localhost:8080>, API on <http://localhost:4000>.

### Option B — Local development

```bash
cp .env.example .env          # then edit DATABASE_URL and the two JWT secrets
npm install                   # root tooling (eslint, prettier, husky)
npm run install:all           # server + web dependencies

npm run db:generate           # prisma generate
npm run db:migrate            # apply migrations
npm run db:seed               # load ~70 Indian cards

npm run dev                   # API on :4000, web on :5173
```

> **`prisma generate` is required before typechecking or building the server.** The Prisma
> Client is generated code and is deliberately not committed; without it, every file that
> imports `@prisma/client` will fail to compile.

---

## Scripts

Run from the repository root:

| Script               | What it does                                         |
| -------------------- | ---------------------------------------------------- |
| `npm run dev`        | API and web dev servers in parallel                  |
| `npm run build`      | Production build of both packages                    |
| `npm run typecheck`  | `tsc --noEmit` across both packages                  |
| `npm run lint`       | ESLint across the repo, zero warnings tolerated      |
| `npm run format`     | Prettier write                                       |
| `npm test`           | Vitest — engine unit tests and API integration tests |
| `npm run db:migrate` | `prisma migrate deploy`                              |
| `npm run db:seed`    | Seed the card catalogue (idempotent)                 |

---

## How the recommendation engine works

1. **Hard filters.** Cards are disqualified outright on age, credit score, income (using
   the salaried or self-employed threshold as appropriate), excluded issuers, and fee
   ceiling. Each rejection carries a human-readable reason.
2. **Value estimate.** For each surviving card the engine computes annual reward earnings
   from the user's spend split — applying the card's _monthly cap_ on accelerated
   earnings — plus fuel surcharge savings and lounge value, minus the effective annual fee
   after any waiver threshold is met.
3. **Ten weighted factors.** `rewardValue`, `categoryFit`, `feeFit`, `loungeFit`,
   `eligibilityHeadroom`, `forexFit`, `fuelFit`, `issuerAffinity`, `welcomeValue`,
   `reputation`. Factors that cannot apply to a user (forex for someone who never spends
   abroad, fuel for a non-driver) are dropped and the remaining weights re-normalised to
   sum to exactly 100 — so every score stays on a comparable 0–100 scale.
4. **Stable ranking.** Ties break on popularity, then slug. Input ordering never affects
   output.

The exact weights are published at `GET /api/recommendations/engine` so anyone can audit
them. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full derivation.

---

## Documentation

- [docs/API.md](docs/API.md) — every endpoint, request and response shape
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design, data model, engine design
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Render, Vercel and Docker deployment
- [PROJECT_STATE.md](PROJECT_STATE.md) — current status, verification state, roadmap

---

## Data disclaimer

The seeded card catalogue is modelled on publicly advertised terms and is **indicative**.
Issuers revise fees, reward rates and benefits frequently. Every card links to its
`officialUrl` — treat that as the source of truth. CardMaxxing is an independent tool, is
not affiliated with any issuer, takes no commissions, and does not provide financial
advice.

## Licence

MIT
