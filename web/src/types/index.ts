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

export type CardNetwork = 'VISA' | 'MASTERCARD' | 'RUPAY' | 'AMEX' | 'DINERS';
export type CardCategory =
  | 'CASHBACK'
  | 'REWARDS'
  | 'TRAVEL'
  | 'FUEL'
  | 'SHOPPING'
  | 'LIFESTYLE'
  | 'BUSINESS'
  | 'SECURED'
  | 'STUDENT';
export type CardTier = 'ENTRY' | 'MID' | 'PREMIUM' | 'SUPER_PREMIUM';
export type RewardType = 'CASHBACK' | 'POINTS' | 'MILES' | 'VOUCHERS';
export type RewardPreference = RewardType | 'ANY';
export type FeeTolerance = 'ZERO' | 'LOW' | 'MODERATE' | 'PREMIUM';
export type LoungePreference = 'NONE' | 'DOMESTIC' | 'INTERNATIONAL';
export type EmploymentType = 'SALARIED' | 'SELF_EMPLOYED';

export interface Card {
  id: string;
  slug: string;
  name: string;
  issuer: string;
  network: CardNetwork;
  category: CardCategory;
  tier: CardTier;
  summary: string;
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
  highlights: string[];
  tags: string[];
  imageUrl: string | null;
  officialUrl: string;
  rating: number;
  popularity: number;
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  monthlyIncome: number | null;
  creditScore: number | null;
  city: string | null;
  createdAt: string;
}

export interface Preferences {
  monthlySpend: number;
  spendSplit: SpendSplit;
  rewardPreference: RewardPreference;
  feeTolerance: FeeTolerance;
  loungePreference: LoungePreference;
  travelsInternationally: boolean;
  ownsVehicle: boolean;
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

export interface FactorBreakdown {
  factor: ScoreFactor;
  raw: number;
  weight: number;
  points: number;
}

export interface Recommendation {
  cardId: string;
  slug: string;
  rank: number;
  score: number;
  breakdown: FactorBreakdown[];
  reasons: string[];
  estimatedAnnualValue: number;
  estimatedAnnualReward: number;
  effectiveAnnualFee: number;
  card: Card;
}

export interface RecommendationResponse {
  engineVersion: string;
  recommendations: Recommendation[];
  rejected: { cardId: string; slug: string; reason: string }[];
  evaluated: number;
  explanation: string | null;
  aiGenerated: boolean;
  aiAvailable: boolean;
  historyId: string | null;
}

export interface Favorite {
  id: string;
  cardId: string;
  note: string | null;
  createdAt: string;
  card: Card;
}

export interface RecommendationRun {
  id: string;
  preferences: Preferences;
  engineVersion: string;
  explanation: string | null;
  aiGenerated: boolean;
  createdAt: string;
  items: {
    id: string;
    rank: number;
    score: number;
    reasons: string[];
    breakdown: FactorBreakdown[];
    card: Card;
  }[];
}

export interface Facets {
  issuers: { value: string; count: number }[];
  categories: { value: string; count: number }[];
  networks: { value: string; count: number }[];
  tiers: { value: string; count: number }[];
  tags: string[];
  annualFee: { min: number; max: number };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CardFilters {
  q?: string;
  issuer?: string[];
  network?: CardNetwork[];
  category?: CardCategory[];
  tier?: CardTier[];
  rewardType?: RewardType[];
  tags?: string[];
  maxAnnualFee?: number;
  lifetimeFree?: boolean;
  loungeAccess?: boolean;
  fuelSurchargeWaiver?: boolean;
  sort?: 'popularity' | 'rating' | 'annualFee' | 'annualFeeDesc' | 'rewardRate' | 'name';
  page?: number;
  pageSize?: number;
}
