import { z } from 'zod';

const csv = <T extends z.ZodTypeAny>(item: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((value) => (Array.isArray(value) ? value : value.split(',')))
    .transform((values) => values.map((v) => v.trim()).filter(Boolean))
    .pipe(z.array(item));

export const cardNetwork = z.enum(['VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'DINERS']);
export const cardCategory = z.enum([
  'CASHBACK',
  'REWARDS',
  'TRAVEL',
  'FUEL',
  'SHOPPING',
  'LIFESTYLE',
  'BUSINESS',
  'SECURED',
  'STUDENT',
]);
export const cardTier = z.enum(['ENTRY', 'MID', 'PREMIUM', 'SUPER_PREMIUM']);
export const rewardType = z.enum(['CASHBACK', 'POINTS', 'MILES', 'VOUCHERS']);

export const listCardsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  issuer: csv(z.string().max(80)).optional(),
  network: csv(cardNetwork).optional(),
  category: csv(cardCategory).optional(),
  tier: csv(cardTier).optional(),
  rewardType: csv(rewardType).optional(),
  tags: csv(z.string().max(60)).optional(),
  minAnnualFee: z.coerce.number().int().min(0).optional(),
  maxAnnualFee: z.coerce.number().int().min(0).optional(),
  maxJoiningFee: z.coerce.number().int().min(0).optional(),
  minRewardRate: z.coerce.number().min(0).max(100).optional(),
  lifetimeFree: z.coerce.boolean().optional(),
  loungeAccess: z.coerce.boolean().optional(),
  fuelSurchargeWaiver: z.coerce.boolean().optional(),
  maxIncome: z.coerce.number().int().min(0).optional(),
  sort: z
    .enum(['popularity', 'rating', 'annualFee', 'annualFeeDesc', 'rewardRate', 'name'])
    .default('popularity'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(12),
});

export const cardSlugSchema = z.object({ slug: z.string().trim().min(1).max(120) });

export const compareSchema = z.object({
  slugs: csv(z.string().max(120)).pipe(
    z
      .array(z.string())
      .min(2, 'Pick at least two cards to compare')
      .max(4, 'You can compare up to four cards at a time'),
  ),
});

export type ListCardsQuery = z.infer<typeof listCardsSchema>;
