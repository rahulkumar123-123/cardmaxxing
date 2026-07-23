import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeCard } from './fixtures';
import type { Card } from '@prisma/client';
// vi.mock is hoisted above this import, so the app boots against the double below.
import { createApp } from '../app';

/**
 * These tests exercise the real Express app — routing, zod validation, auth middleware,
 * cookie handling and the error translator — against an in-memory Prisma double.
 * Database behaviour itself is covered by the schema migration and seed, not here.
 */
const state = vi.hoisted(() => ({
  cards: [] as Card[],
  users: [] as Record<string, unknown>[],
  sessions: [] as Record<string, unknown>[],
  favorites: [] as Record<string, unknown>[],
  histories: [] as Record<string, unknown>[],
}));

let idCounter = 0;
const nextId = (prefix: string): string => `${prefix}_${(idCounter += 1)}`;

vi.mock('../lib/prisma', () => {
  const matchesWhere = (
    row: Record<string, unknown>,
    where: Record<string, unknown> = {},
  ): boolean =>
    Object.entries(where).every(([key, condition]) => {
      if (key === 'AND')
        return (condition as Record<string, unknown>[]).every((c) => matchesWhere(row, c));
      if (key === 'OR')
        return (condition as Record<string, unknown>[]).some((c) => matchesWhere(row, c));
      const value = row[key];
      if (condition !== null && typeof condition === 'object') {
        const c = condition as Record<string, unknown>;
        if ('in' in c) return (c.in as unknown[]).includes(value);
        if ('notIn' in c) return !(c.notIn as unknown[]).includes(value);
        if ('gte' in c) return Number(value) >= Number(c.gte);
        if ('lte' in c) return Number(value) <= Number(c.lte);
        if ('gt' in c) return Number(value) > Number(c.gt);
        if ('has' in c) return Array.isArray(value) && value.includes(c.has);
        if ('hasSome' in c)
          return Array.isArray(value) && (c.hasSome as unknown[]).some((v) => value.includes(v));
        if ('contains' in c)
          return String(value).toLowerCase().includes(String(c.contains).toLowerCase());
      }
      return value === condition;
    });

  const prisma = {
    $transaction: (operations: unknown) =>
      Array.isArray(operations) ? Promise.all(operations) : Promise.resolve([]),
    card: {
      findMany: ({
        where,
        skip = 0,
        take = 100,
      }: { where?: Record<string, unknown>; skip?: number; take?: number } = {}) =>
        Promise.resolve(
          state.cards.filter((card) => matchesWhere(card as never, where)).slice(skip, skip + take),
        ),
      count: ({ where }: { where?: Record<string, unknown> } = {}) =>
        Promise.resolve(state.cards.filter((card) => matchesWhere(card as never, where)).length),
      findFirst: ({ where }: { where?: Record<string, unknown> } = {}) =>
        Promise.resolve(state.cards.find((card) => matchesWhere(card as never, where)) ?? null),
      findUnique: ({ where }: { where?: Record<string, unknown> } = {}) =>
        Promise.resolve(state.cards.find((card) => matchesWhere(card as never, where)) ?? null),
      groupBy: () => Promise.resolve([]),
      aggregate: () => Promise.resolve({ _min: { annualFee: 0 }, _max: { annualFee: 0 } }),
    },
    user: {
      findUnique: ({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(state.users.find((user) => matchesWhere(user, where)) ?? null),
      create: ({ data }: { data: Record<string, unknown> }) => {
        const user = {
          id: nextId('user'),
          role: 'USER',
          monthlyIncome: null,
          creditScore: null,
          city: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        state.users.push(user);
        return Promise.resolve(user);
      },
      update: ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        const user = state.users.find((u) => matchesWhere(u, where));
        Object.assign(user as object, data);
        return Promise.resolve(user);
      },
    },
    session: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        const session = { id: nextId('sess'), revokedAt: null, createdAt: new Date(), ...data };
        state.sessions.push(session);
        return Promise.resolve(session);
      },
      update: ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        const session = state.sessions.find((s) => matchesWhere(s, where));
        Object.assign(session as object, data);
        return Promise.resolve(session);
      },
      findUnique: ({ where }: { where: Record<string, unknown> }) => {
        const session = state.sessions.find((s) => matchesWhere(s, where));
        if (!session) return Promise.resolve(null);
        return Promise.resolve({
          ...session,
          user: state.users.find((u) => u.id === session.userId),
        });
      },
      updateMany: ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        const matched = state.sessions.filter((s) => matchesWhere(s, where));
        matched.forEach((s) => Object.assign(s, data));
        return Promise.resolve({ count: matched.length });
      },
    },
    favorite: {
      findMany: ({ where }: { where?: Record<string, unknown> } = {}) =>
        Promise.resolve(
          state.favorites
            .filter((f) => matchesWhere(f, where))
            .map((f) => ({ ...f, card: state.cards.find((c) => c.id === f.cardId) })),
        ),
      upsert: ({
        where,
        create,
      }: {
        where: { userId_cardId: { userId: string; cardId: string } };
        create: Record<string, unknown>;
      }) => {
        const { userId, cardId } = where.userId_cardId;
        let favorite = state.favorites.find((f) => f.userId === userId && f.cardId === cardId);
        if (!favorite) {
          favorite = { id: nextId('fav'), createdAt: new Date(), ...create };
          state.favorites.push(favorite);
        }
        return Promise.resolve({ ...favorite, card: state.cards.find((c) => c.id === cardId) });
      },
      deleteMany: ({ where }: { where: Record<string, unknown> }) => {
        const before = state.favorites.length;
        state.favorites = state.favorites.filter((f) => !matchesWhere(f, where));
        return Promise.resolve({ count: before - state.favorites.length });
      },
    },
    recommendationHistory: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        const history = { id: nextId('hist'), createdAt: new Date(), ...data };
        state.histories.push(history);
        return Promise.resolve(history);
      },
      findMany: () => Promise.resolve(state.histories.map((h) => ({ ...h, items: [] }))),
      findFirst: ({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(state.histories.find((h) => matchesWhere(h, where)) ?? null),
      count: () => Promise.resolve(state.histories.length),
      deleteMany: ({ where }: { where: Record<string, unknown> }) => {
        const before = state.histories.length;
        state.histories = state.histories.filter((h) => !matchesWhere(h, where));
        return Promise.resolve({ count: before - state.histories.length });
      },
    },
  };

  return { prisma, disconnectPrisma: () => Promise.resolve() };
});

const app = createApp();

const VALID_USER = { name: 'Rahul Test', email: 'rahul@example.com', password: 'Str0ngPassword' };

beforeEach(() => {
  state.cards = [
    makeCard(),
    makeCard({
      id: 'card_test_2',
      slug: 'free-card',
      name: 'Freedom Free Card',
      joiningFee: 0,
      annualFee: 0,
      feeWaiverSpend: null,
      popularity: 80,
    }),
  ];
  state.users = [];
  state.sessions = [];
  state.favorites = [];
  state.histories = [];
});

async function signUp(): Promise<string[]> {
  const response = await request(app).post('/api/auth/register').send(VALID_USER).expect(201);
  return response.get('Set-Cookie') ?? [];
}

describe('health', () => {
  it('reports service status', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body.data.status).toBe('ok');
    expect(typeof response.body.data.aiAvailable).toBe('boolean');
  });
});

describe('GET /api/cards', () => {
  it('returns a paginated envelope', async () => {
    const response = await request(app).get('/api/cards').expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data).toMatchObject({ page: 1, pageSize: 12, total: 2 });
  });

  it('filters to lifetime free cards', async () => {
    const response = await request(app).get('/api/cards?lifetimeFree=true').expect(200);
    expect(response.body.data.items.map((card: { slug: string }) => card.slug)).toEqual([
      'free-card',
    ]);
  });

  it('rejects an invalid sort value', async () => {
    const response = await request(app).get('/api/cards?sort=cheapest').expect(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(response.body.error.details[0].field).toBe('sort');
  });

  it('rejects a page size above the maximum', async () => {
    await request(app).get('/api/cards?pageSize=500').expect(400);
  });

  it('returns 404 for an unknown slug', async () => {
    const response = await request(app).get('/api/cards/does-not-exist').expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns a single card by slug', async () => {
    const response = await request(app).get('/api/cards/test-card').expect(200);
    expect(response.body.data.card.name).toBe('Test Rewards Card');
  });
});

describe('GET /api/cards/compare', () => {
  it('requires at least two slugs', async () => {
    await request(app).get('/api/cards/compare?slugs=test-card').expect(400);
  });

  it('returns cards in the requested order', async () => {
    const response = await request(app)
      .get('/api/cards/compare?slugs=free-card,test-card')
      .expect(200);
    expect(response.body.data.cards.map((c: { slug: string }) => c.slug)).toEqual([
      'free-card',
      'test-card',
    ]);
  });

  it('404s when a slug is unknown', async () => {
    await request(app).get('/api/cards/compare?slugs=test-card,nope').expect(404);
  });
});

describe('authentication', () => {
  it('registers a user and sets httpOnly cookies', async () => {
    const response = await request(app).post('/api/auth/register').send(VALID_USER).expect(201);
    const cookies = response.get('Set-Cookie') ?? [];
    expect(cookies.join(';')).toContain('cm_access_token');
    expect(cookies.join(';')).toContain('cm_refresh_token');
    expect(cookies.every((cookie) => cookie.includes('HttpOnly'))).toBe(true);
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('rejects a weak password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, password: 'weak' })
      .expect(400);
    expect(response.body.error.details.some((d: { field: string }) => d.field === 'password')).toBe(
      true,
    );
  });

  it('rejects a duplicate email', async () => {
    await signUp();
    const response = await request(app).post('/api/auth/register').send(VALID_USER).expect(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('signs in with correct credentials', async () => {
    await signUp();
    await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password })
      .expect(200);
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    await signUp();
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: 'WrongPassword1' })
      .expect(401);
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'WrongPassword1' })
      .expect(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it('returns the current user from the access cookie', async () => {
    const cookies = await signUp();
    const response = await request(app).get('/api/auth/me').set('Cookie', cookies).expect(200);
    expect(response.body.data.user.email).toBe(VALID_USER.email);
  });

  it('blocks /me without a token', async () => {
    const response = await request(app).get('/api/auth/me').expect(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rotates the refresh token and revokes the old session', async () => {
    const cookies = await signUp();
    await request(app).post('/api/auth/refresh').set('Cookie', cookies).expect(200);
    // The original refresh token was revoked by the rotation, so replaying it must fail.
    await request(app).post('/api/auth/refresh').set('Cookie', cookies).expect(401);
  });

  it('clears cookies on logout', async () => {
    const cookies = await signUp();
    const response = await request(app).post('/api/auth/logout').set('Cookie', cookies).expect(200);
    expect((response.get('Set-Cookie') ?? []).join(';')).toContain('cm_access_token=;');
  });
});

describe('favourites', () => {
  it('requires authentication', async () => {
    await request(app).get('/api/favorites').expect(401);
  });

  it('adds, lists and removes a favourite', async () => {
    const cookies = await signUp();

    await request(app)
      .post('/api/favorites')
      .set('Cookie', cookies)
      .send({ cardId: 'card_test_1' })
      .expect(201);

    const list = await request(app).get('/api/favorites').set('Cookie', cookies).expect(200);
    expect(list.body.data.favorites).toHaveLength(1);

    await request(app).delete('/api/favorites/card_test_1').set('Cookie', cookies).expect(200);
    await request(app).delete('/api/favorites/card_test_1').set('Cookie', cookies).expect(404);
  });

  it('404s for an unknown card', async () => {
    const cookies = await signUp();
    await request(app)
      .post('/api/favorites')
      .set('Cookie', cookies)
      .send({ cardId: 'nope' })
      .expect(404);
  });
});

describe('recommendations', () => {
  const preferences = {
    monthlySpend: 40000,
    spendSplit: { DINING: 60, FUEL: 40 },
    annualIncome: 1200000,
    creditScore: 780,
    age: 30,
  };

  it('works for anonymous visitors and does not write history', async () => {
    const response = await request(app)
      .post('/api/recommendations')
      .send({ preferences })
      .expect(200);
    expect(response.body.data.recommendations.length).toBeGreaterThan(0);
    expect(response.body.data.historyId).toBeNull();
    expect(state.histories).toHaveLength(0);
  });

  it('saves a history entry when signed in', async () => {
    const cookies = await signUp();
    const response = await request(app)
      .post('/api/recommendations')
      .set('Cookie', cookies)
      .send({ preferences })
      .expect(200);
    expect(response.body.data.historyId).toBeTruthy();
    expect(state.histories).toHaveLength(1);
  });

  it('returns identical output for identical input', async () => {
    const first = await request(app).post('/api/recommendations').send({ preferences }).expect(200);
    const second = await request(app)
      .post('/api/recommendations')
      .send({ preferences })
      .expect(200);
    expect(first.body.data.recommendations).toEqual(second.body.data.recommendations);
  });

  it('leaves the explanation empty when no AI key is configured', async () => {
    const response = await request(app)
      .post('/api/recommendations')
      .send({ preferences, explain: true })
      .expect(200);
    expect(response.body.data.explanation).toBeNull();
    expect(response.body.data.aiGenerated).toBe(false);
    expect(response.body.data.recommendations.length).toBeGreaterThan(0);
  });

  it('rejects a spend split totalling more than 100%', async () => {
    await request(app)
      .post('/api/recommendations')
      .send({ preferences: { ...preferences, spendSplit: { DINING: 80, FUEL: 80 } } })
      .expect(400);
  });

  it('rejects an out-of-range credit score', async () => {
    await request(app)
      .post('/api/recommendations')
      .send({ preferences: { ...preferences, creditScore: 1200 } })
      .expect(400);
  });

  it('publishes the engine weights for inspection', async () => {
    const response = await request(app).get('/api/recommendations/engine').expect(200);
    expect(response.body.data.deterministic).toBe(true);
    expect(response.body.data.aiRole).toBe('explanation-only');
    const total = Object.values(response.body.data.baseWeights as Record<string, number>).reduce(
      (sum, weight) => sum + weight,
      0,
    );
    expect(total).toBe(100);
  });
});

describe('history', () => {
  it('requires authentication', async () => {
    await request(app).get('/api/history').expect(401);
  });

  it('lists and deletes runs belonging to the user', async () => {
    const cookies = await signUp();
    await request(app)
      .post('/api/recommendations')
      .set('Cookie', cookies)
      .send({ preferences: { monthlySpend: 20000, annualIncome: 900000 } })
      .expect(200);

    const list = await request(app).get('/api/history').set('Cookie', cookies).expect(200);
    expect(list.body.data.items).toHaveLength(1);

    const runId = state.histories[0]!.id as string;
    await request(app).delete(`/api/history/${runId}`).set('Cookie', cookies).expect(200);
    await request(app).delete(`/api/history/${runId}`).set('Cookie', cookies).expect(404);
  });
});

describe('error handling', () => {
  it('404s an unknown route with a structured error', async () => {
    const response = await request(app).get('/api/not-a-route').expect(404);
    expect(response.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });

  it('rejects oversized JSON bodies', async () => {
    const huge = {
      preferences: { monthlySpend: 1000, annualIncome: 100000, note: 'x'.repeat(200000) },
    };
    const response = await request(app).post('/api/recommendations').send(huge);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
