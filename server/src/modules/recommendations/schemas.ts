import { z } from 'zod';
import { SPEND_CATEGORIES } from '../../domain/types';

const spendSplit = z
  .record(z.enum(SPEND_CATEGORIES), z.coerce.number().min(0).max(100))
  .default({})
  .refine(
    (split) => Object.values(split).reduce((sum, value) => sum + (value ?? 0), 0) <= 100.001,
    'Spend split cannot add up to more than 100%',
  );

export const preferencesSchema = z.object({
  monthlySpend: z.coerce.number().int().min(0).max(10_000_000),
  spendSplit,
  rewardPreference: z.enum(['CASHBACK', 'POINTS', 'MILES', 'VOUCHERS', 'ANY']).default('ANY'),
  feeTolerance: z.enum(['ZERO', 'LOW', 'MODERATE', 'PREMIUM']).default('MODERATE'),
  loungePreference: z.enum(['NONE', 'DOMESTIC', 'INTERNATIONAL']).default('NONE'),
  travelsInternationally: z.boolean().default(false),
  ownsVehicle: z.boolean().default(false),
  annualIncome: z.coerce.number().int().min(0).max(1_000_000_000),
  creditScore: z.coerce.number().int().min(300).max(900).default(750),
  age: z.coerce.number().int().min(18).max(99).default(30),
  employmentType: z.enum(['SALARIED', 'SELF_EMPLOYED']).default('SALARIED'),
  preferredIssuers: z.array(z.string().trim().max(80)).max(10).default([]),
  excludedIssuers: z.array(z.string().trim().max(80)).max(10).default([]),
});

export const recommendSchema = z.object({
  preferences: preferencesSchema,
  limit: z.coerce.number().int().min(1).max(10).default(5),
  /** Ask for the optional AI-written explanation. Silently ignored when AI is disabled. */
  explain: z.boolean().default(false),
});

export type RecommendRequest = z.infer<typeof recommendSchema>;
