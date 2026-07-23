# CardMaxxing API

Base URL: `/api` · All responses are JSON.

## Response envelope

Success:

```json
{ "success": true, "data": {} }
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed",
    "details": [{ "field": "sort", "message": "Invalid enum value" }]
  }
}
```

| Code                    | Status | Meaning                                                 |
| ----------------------- | ------ | ------------------------------------------------------- |
| `BAD_REQUEST`           | 400    | Validation failed; `details` lists the offending fields |
| `UNAUTHORIZED`          | 401    | Missing, invalid or expired access token                |
| `FORBIDDEN`             | 403    | Authenticated but not permitted                         |
| `NOT_FOUND`             | 404    | Unknown route or resource                               |
| `CONFLICT`              | 409    | Duplicate resource (e.g. email already registered)      |
| `TOO_MANY_REQUESTS`     | 429    | Rate limit exceeded                                     |
| `INTERNAL_SERVER_ERROR` | 500    | Unexpected failure; message is generic in production    |

## Authentication

Two httpOnly cookies are issued on register/login:

| Cookie             | Lifetime   | Purpose                                           |
| ------------------ | ---------- | ------------------------------------------------- |
| `cm_access_token`  | 15 minutes | Authorises API calls                              |
| `cm_refresh_token` | 30 days    | Exchanges for a new pair via `POST /auth/refresh` |

Refresh tokens are **rotated** on every use: the presented token is revoked and replaced,
so a stolen token is usable at most once. Only the SHA-256 digest is stored server-side.
`Authorization: Bearer <token>` is also accepted for non-browser clients.

Rate limits: 300 requests / 15 min across `/api`, and 20 failed attempts / 15 min on
`/auth/register` and `/auth/login`.

---

## Health

### `GET /health`

Not under `/api` and not rate limited.

```json
{ "success": true, "data": { "status": "ok", "uptime": 1234.5, "aiAvailable": false } }
```

---

## Auth

### `POST /api/auth/register` → `201`

```json
{ "name": "Rahul", "email": "rahul@example.com", "password": "Str0ngPassword" }
```

Password policy: at least 10 characters, with a lowercase letter, an uppercase letter and
a digit. Returns `{ "user": { … } }` and sets both cookies. `409` if the email exists.

### `POST /api/auth/login` → `200`

```json
{ "email": "rahul@example.com", "password": "Str0ngPassword" }
```

Returns `401 Incorrect email or password` for both a wrong password and an unknown email,
with a constant-time-ish hash comparison in both paths so response timing does not leak
account existence.

### `POST /api/auth/refresh` → `200`

Reads `cm_refresh_token`, rotates the session, sets fresh cookies.

### `POST /api/auth/logout` → `200`

Revokes the current session and clears both cookies.

### `POST /api/auth/logout-all` → `200` _(auth required)_

Revokes every active session for the user.

### `GET /api/auth/me` → `200` _(auth required)_

### `PATCH /api/auth/me` → `200` _(auth required)_

```json
{ "name": "Rahul K", "monthlyIncome": 150000, "creditScore": 780, "city": "Bengaluru" }
```

---

## Cards

### `GET /api/cards` → `200`

| Query                                                         | Type    | Notes                                                                                |
| ------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| `q`                                                           | string  | Matches name, issuer, summary or tag                                                 |
| `issuer`, `network`, `category`, `tier`, `rewardType`, `tags` | CSV     | Repeatable via comma separation                                                      |
| `minAnnualFee`, `maxAnnualFee`, `maxJoiningFee`               | number  | INR                                                                                  |
| `minRewardRate`                                               | number  | Percent                                                                              |
| `lifetimeFree`, `loungeAccess`, `fuelSurchargeWaiver`         | boolean |                                                                                      |
| `maxIncome`                                                   | number  | Cards you qualify for at this income                                                 |
| `sort`                                                        | enum    | `popularity` (default), `rating`, `annualFee`, `annualFeeDesc`, `rewardRate`, `name` |
| `page`, `pageSize`                                            | number  | `pageSize` max 60, default 12                                                        |

```json
{
  "success": true,
  "data": { "items": [/* Card[] */], "total": 73, "page": 1, "pageSize": 12, "totalPages": 7 }
}
```

### `GET /api/cards/facets` → `200`

Facet counts for the filter rail, plus the observed annual-fee range.

### `GET /api/cards/compare?slugs=a,b,c` → `200`

2–4 slugs. Returns cards **in the order requested**. `404` if any slug is unknown.

### `GET /api/cards/:slug` → `200`

---

## Recommendations

### `POST /api/recommendations` → `200`

Works anonymously. When authenticated, the run is persisted to history.

```json
{
  "preferences": {
    "monthlySpend": 60000,
    "spendSplit": { "DINING": 30, "ONLINE_SHOPPING": 40, "FUEL": 30 },
    "rewardPreference": "ANY",
    "feeTolerance": "MODERATE",
    "loungePreference": "DOMESTIC",
    "travelsInternationally": false,
    "ownsVehicle": true,
    "annualIncome": 1800000,
    "creditScore": 780,
    "age": 29,
    "employmentType": "SALARIED",
    "preferredIssuers": [],
    "excludedIssuers": []
  },
  "limit": 5,
  "explain": true
}
```

`spendSplit` values are percentages and must total ≤ 100; the engine normalises them.
`explain` is ignored when no `ANTHROPIC_API_KEY` is configured.

```json
{
  "success": true,
  "data": {
    "engineVersion": "1.0.0",
    "evaluated": 73,
    "recommendations": [
      {
        "rank": 1,
        "score": 87.42,
        "cardId": "…",
        "slug": "sbi-cashback",
        "estimatedAnnualReward": 32400,
        "effectiveAnnualFee": 0,
        "estimatedAnnualValue": 32400,
        "reasons": ["strong net annual value at your spend level", "…"],
        "breakdown": [{ "factor": "rewardValue", "raw": 0.9, "weight": 26, "points": 23.4 }],
        "card": {}
      }
    ],
    "rejected": [
      { "slug": "hdfc-infinia-metal", "reason": "Requires an annual income of at least ₹36,00,000" }
    ],
    "explanation": null,
    "aiGenerated": false,
    "aiAvailable": false,
    "historyId": null
  }
}
```

### `GET /api/recommendations/engine` → `200`

Publishes the engine version and the base weight of every factor, so the ranking is
independently auditable.

---

## Favourites _(auth required)_

| Method   | Path                     | Notes                                                              |
| -------- | ------------------------ | ------------------------------------------------------------------ |
| `GET`    | `/api/favorites`         | Newest first, card included                                        |
| `POST`   | `/api/favorites`         | `{ "cardId": "…", "note": "optional" }` — idempotent upsert, `201` |
| `DELETE` | `/api/favorites/:cardId` | `404` if not saved                                                 |

## History _(auth required)_

| Method   | Path               | Notes                                             |
| -------- | ------------------ | ------------------------------------------------- |
| `GET`    | `/api/history`     | Paginated (`page`, `pageSize` ≤ 50), items ranked |
| `GET`    | `/api/history/:id` | Scoped to the owner; `404` otherwise              |
| `DELETE` | `/api/history/:id` | Scoped to the owner                               |
