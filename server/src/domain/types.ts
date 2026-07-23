/**
 * Domain types shared by the recommendation engine, the API layer and the client.
 * These are intentionally free of any Prisma import so the engine stays a pure,
 * dependency-free unit that can be tested in isolation.
 */

export const SPEND_CATEGORIES = [
  'DINING',
  'TRAVEL',
  'FUEL',
  'GROCERIES',
  'ONLINE_SHOPPING',
  'UTILITIES',
  'ENTERTAINMENT',
  'INTERNATIONAL',
  'INSURANCE',
  'RENT',
] as const;

export type SpendCategory = (typeof SPEND_CATEGORIES)[number];

export type SpendSplit = Partial<Record<SpendCategory, number>>;

export type RewardType = 'CASHBACK' | 'POINTS' | 'MILES' | 'VOUCHERS';
export type RewardPreference = RewardType | 'ANY';
export type FeeTolerance = 'ZERO' | 'LOW' | 'MODERATE' | 'PREMIUM';
export type LoungePreference = 'NONE' | 'DOMESTIC' | 'INTERNATIONAL';
export type EmploymentType = 'SALARIED' | 'SELF_EMPLOYED';
export type CardTier = 'ENTRY' | 'MID' | 'PREMIUM' | 'SUPER_PREMIUM';

/** The maximum annual fee a user is willing to absorb, per tolerance band (INR). */
export const FEE_TOLERANCE_CEILING: Record<FeeTolerance, number> = {
  ZERO: 0,
  LOW: 1000,
  MODERATE: 5000,
  PREMIUM: 60000,
};

/** The subset of a Card the engine needs. Kept structural so Prisma rows satisfy it. */
export interface ScoringCard {
  id: string;
  slug: string;
  name: string;
  issuer: string;
  tier: CardTier;
  joiningFee: number;
  annualFee: number;
  feeWaiverSpend: number | null;
  forexMarkup: number;
  minIncomeSalaried: number;
  minIncomeSelfEmployed: number;
  minAge: number;
  maxAge: number;
  minCreditScore: number;
  rewardType: RewardType;
  baseRewardRate: number;
  rewardMultipliers: SpendSplit;
  cappedMonthlyReward: number | null;
  welcomeBenefit: string | null;
  milestoneBenefit: string | null;
  domesticLoungeVisits: number;
  internationalLoungeVisits: number;
  fuelSurchargeWaiver: boolean;
  fuelWaiverMonthlyCap: number | null;
  golfBenefit: boolean;
  insuranceCoverInr: number | null;
  conciergeService: boolean;
  rating: number;
  popularity: number;
  tags: string[];
}

export interface Preferences {
  /** Total monthly card spend in INR. */
  monthlySpend: number;
  /** Percentage of monthly spend per category. Values are normalised by the engine. */
  spendSplit: SpendSplit;
  rewardPreference: RewardPreference;
  feeTolerance: FeeTolerance;
  loungePreference: LoungePreference;
  travelsInternationally: boolean;
  ownsVehicle: boolean;
  /** Gross annual income in INR. */
  annualIncome: number;
  creditScore: number;
  age: number;
  employmentType: EmploymentType;
  preferredIssuers: string[];
  excludedIssuers: string[];
}

export type ScoreFactor =
  | 'rewardValue'
  | 'categoryFit'
  | 'feeFit'
  | 'loungeFit'
  | 'eligibilityHeadroom'
  | 'forexFit'
  | 'fuelFit'
  | 'issuerAffinity'
  | 'welcomeValue'
  | 'reputation';

/** Per-factor detail: the 0..1 raw score, the weight applied and the resulting points. */
export interface FactorBreakdown {
  factor: ScoreFactor;
  raw: number;
  weight: number;
  points: number;
}

export interface ScoredCard {
  cardId: string;
  slug: string;
  rank: number;
  /** Final score out of 100. */
  score: number;
  breakdown: FactorBreakdown[];
  reasons: string[];
  /** Estimated annual reward value in INR, net of the effective annual fee. */
  estimatedAnnualValue: number;
  estimatedAnnualReward: number;
  effectiveAnnualFee: number;
}

export interface RejectedCard {
  cardId: string;
  slug: string;
  reason: string;
}

export interface RecommendationResult {
  engineVersion: string;
  recommendations: ScoredCard[];
  rejected: RejectedCard[];
  evaluated: number;
}
