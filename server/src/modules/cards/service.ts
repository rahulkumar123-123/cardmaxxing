import type { Card, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { NotFoundError, BadRequestError } from '../../lib/errors';
import { paginate, type Paginated } from '../../lib/http';
import type { ListCardsQuery } from './schemas';

const SORT_ORDER: Record<ListCardsQuery['sort'], Prisma.CardOrderByWithRelationInput[]> = {
  popularity: [{ popularity: 'desc' }, { rating: 'desc' }, { name: 'asc' }],
  rating: [{ rating: 'desc' }, { popularity: 'desc' }, { name: 'asc' }],
  annualFee: [{ annualFee: 'asc' }, { popularity: 'desc' }, { name: 'asc' }],
  annualFeeDesc: [{ annualFee: 'desc' }, { popularity: 'desc' }, { name: 'asc' }],
  rewardRate: [{ baseRewardRate: 'desc' }, { popularity: 'desc' }, { name: 'asc' }],
  name: [{ name: 'asc' }],
};

export function buildCardWhere(query: Partial<ListCardsQuery>): Prisma.CardWhereInput {
  const where: Prisma.CardWhereInput = { isActive: true };
  const and: Prisma.CardWhereInput[] = [];

  if (query.q) {
    and.push({
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { issuer: { contains: query.q, mode: 'insensitive' } },
        { summary: { contains: query.q, mode: 'insensitive' } },
        { tags: { has: query.q.toLowerCase() } },
      ],
    });
  }
  if (query.issuer?.length) and.push({ issuer: { in: query.issuer } });
  if (query.network?.length) and.push({ network: { in: query.network } });
  if (query.category?.length) and.push({ category: { in: query.category } });
  if (query.tier?.length) and.push({ tier: { in: query.tier } });
  if (query.rewardType?.length) and.push({ rewardType: { in: query.rewardType } });
  if (query.tags?.length) and.push({ tags: { hasSome: query.tags } });

  if (query.minAnnualFee !== undefined) and.push({ annualFee: { gte: query.minAnnualFee } });
  if (query.maxAnnualFee !== undefined) and.push({ annualFee: { lte: query.maxAnnualFee } });
  if (query.maxJoiningFee !== undefined) and.push({ joiningFee: { lte: query.maxJoiningFee } });
  if (query.minRewardRate !== undefined) and.push({ baseRewardRate: { gte: query.minRewardRate } });
  if (query.lifetimeFree) and.push({ joiningFee: 0, annualFee: 0 });
  if (query.loungeAccess) {
    and.push({
      OR: [{ domesticLoungeVisits: { gt: 0 } }, { internationalLoungeVisits: { gt: 0 } }],
    });
  }
  if (query.fuelSurchargeWaiver) and.push({ fuelSurchargeWaiver: true });
  if (query.maxIncome !== undefined) and.push({ minIncomeSalaried: { lte: query.maxIncome } });

  if (and.length) where.AND = and;
  return where;
}

export async function listCards(query: ListCardsQuery): Promise<Paginated<Card>> {
  if (
    query.minAnnualFee !== undefined &&
    query.maxAnnualFee !== undefined &&
    query.minAnnualFee > query.maxAnnualFee
  ) {
    throw new BadRequestError('minAnnualFee cannot be greater than maxAnnualFee');
  }

  const where = buildCardWhere(query);
  const [items, total] = await prisma.$transaction([
    prisma.card.findMany({
      where,
      orderBy: SORT_ORDER[query.sort],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.card.count({ where }),
  ]);

  return paginate(items, total, query.page, query.pageSize);
}

export async function getCardBySlug(slug: string): Promise<Card> {
  const card = await prisma.card.findFirst({ where: { slug, isActive: true } });
  if (!card) throw new NotFoundError(`No card found for "${slug}"`);
  return card;
}

export async function compareCards(slugs: string[]): Promise<Card[]> {
  const unique = [...new Set(slugs)];
  const cards = await prisma.card.findMany({ where: { slug: { in: unique }, isActive: true } });

  const missing = unique.filter((slug) => !cards.some((card) => card.slug === slug));
  if (missing.length) throw new NotFoundError(`Unknown card(s): ${missing.join(', ')}`);

  // Preserve the order the client asked for.
  return unique.map((slug) => cards.find((card) => card.slug === slug)!);
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface CardFacets {
  issuers: FacetValue[];
  categories: FacetValue[];
  networks: FacetValue[];
  tiers: FacetValue[];
  tags: string[];
  annualFee: { min: number; max: number };
}

/** Facet counts that power the catalogue filter rail. */
export async function getFacets(): Promise<CardFacets> {
  const where: Prisma.CardWhereInput = { isActive: true };
  const groupArgs = { where, _count: { _all: true } } as const;

  const [issuers, categories, networks, tiers, aggregate, tagRows] = await prisma.$transaction([
    prisma.card.groupBy({ ...groupArgs, by: ['issuer'], orderBy: { issuer: 'asc' } }),
    prisma.card.groupBy({ ...groupArgs, by: ['category'], orderBy: { category: 'asc' } }),
    prisma.card.groupBy({ ...groupArgs, by: ['network'], orderBy: { network: 'asc' } }),
    prisma.card.groupBy({ ...groupArgs, by: ['tier'], orderBy: { tier: 'asc' } }),
    prisma.card.aggregate({ where, _min: { annualFee: true }, _max: { annualFee: true } }),
    prisma.card.findMany({ where, select: { tags: true } }),
  ]);

  /** Highest count first, then alphabetically, so the rail order is stable. */
  const byCount = (a: FacetValue, b: FacetValue): number =>
    b.count - a.count || a.value.localeCompare(b.value);

  /** groupBy types `_count` as a union; this reads the `_all` tally we actually asked for. */
  const countOf = (row: unknown): number => {
    const count = (row as { _count?: unknown })._count;
    if (typeof count === 'object' && count !== null && '_all' in count) {
      const all = (count as { _all?: unknown })._all;
      if (typeof all === 'number') return all;
    }
    return 0;
  };

  const toFacets = <R>(rows: R[], key: (row: R) => string): FacetValue[] =>
    rows.map((row) => ({ value: key(row), count: countOf(row) })).sort(byCount);

  return {
    issuers: toFacets(issuers, (row) => row.issuer),
    categories: toFacets(categories, (row) => row.category),
    networks: toFacets(networks, (row) => row.network),
    tiers: toFacets(tiers, (row) => row.tier),
    tags: [...new Set(tagRows.flatMap((row) => row.tags))].sort(),
    annualFee: {
      min: aggregate._min.annualFee ?? 0,
      max: aggregate._max.annualFee ?? 0,
    },
  };
}
