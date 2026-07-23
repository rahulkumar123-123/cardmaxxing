import {
  FEE_TOLERANCE_CEILING,
  type FactorBreakdown,
  type Preferences,
  type RecommendationResult,
  type RejectedCard,
  type ScoreFactor,
  type ScoringCard,
  type ScoredCard,
  type SpendCategory,
  type SpendSplit,
} from '../../domain/types';
import { ENGINE_VERSION, resolveWeights } from './weights';

/**
 * CardMaxxing deterministic recommendation engine.
 *
 * The engine is a pure function: the same preferences and the same card set always
 * produce byte-identical output. No AI, no randomness, no I/O. Large language models
 * are only ever used downstream to phrase an explanation of what this engine decided.
 */

/** An effective return of 5% on total spend is treated as a best-in-market outcome. */
const EXCELLENT_RETURN_RATE = 5;
/** Typical Indian forex markup band, used to normalise the forex factor. */
const BEST_FOREX_MARKUP = 0.99;
const WORST_FOREX_MARKUP = 3.5;
/** Notional INR value assigned to a single complimentary lounge visit. */
const DOMESTIC_LOUNGE_VISIT_VALUE = 1000;
const INTERNATIONAL_LOUNGE_VISIT_VALUE = 2500;
/** Fuel surcharge in India is 1% of the transaction value. */
const FUEL_SURCHARGE_RATE = 1;

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));
const round = (value: number, dp = 2): number => {
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
};

/** Normalises a spend split into fractions that sum to 1. An empty split means 100% general spend. */
export function normaliseSpendSplit(split: SpendSplit): SpendSplit {
  const entries = (Object.entries(split) as [SpendCategory, number][]).filter(
    ([, value]) => Number.isFinite(value) && value > 0,
  );
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (total === 0) return {};

  const normalised: SpendSplit = {};
  for (const [category, value] of entries) {
    normalised[category] = value / total;
  }
  return normalised;
}

/** Effective percentage return this card pays on a given category. */
function rateForCategory(card: ScoringCard, category: SpendCategory): number {
  const multiplier = card.rewardMultipliers[category];
  return typeof multiplier === 'number' && multiplier > 0 ? multiplier : card.baseRewardRate;
}

export interface ValueEstimate {
  annualSpend: number;
  annualReward: number;
  annualFuelSaving: number;
  annualLoungeValue: number;
  effectiveAnnualFee: number;
  feeWaived: boolean;
  netAnnualValue: number;
}

/**
 * Estimates what the card is worth to this user over a year, in rupees.
 * Accelerated earnings above the base rate are subject to the card's monthly cap.
 */
export function estimateAnnualValue(card: ScoringCard, preferences: Preferences): ValueEstimate {
  const split = normaliseSpendSplit(preferences.spendSplit);
  const monthlySpend = Math.max(0, preferences.monthlySpend);
  const annualSpend = monthlySpend * 12;

  const baseMonthlyReward = (monthlySpend * card.baseRewardRate) / 100;

  let acceleratedMonthlyExtra = 0;
  for (const [category, fraction] of Object.entries(split) as [SpendCategory, number][]) {
    const rate = rateForCategory(card, category);
    if (rate > card.baseRewardRate) {
      acceleratedMonthlyExtra += (monthlySpend * fraction * (rate - card.baseRewardRate)) / 100;
    }
  }
  if (card.cappedMonthlyReward !== null) {
    acceleratedMonthlyExtra = Math.min(acceleratedMonthlyExtra, card.cappedMonthlyReward);
  }

  const annualReward = (baseMonthlyReward + acceleratedMonthlyExtra) * 12;

  let annualFuelSaving = 0;
  if (preferences.ownsVehicle && card.fuelSurchargeWaiver) {
    const monthlyFuelSpend = monthlySpend * (split.FUEL ?? 0);
    const uncapped = (monthlyFuelSpend * FUEL_SURCHARGE_RATE) / 100;
    const monthlySaving =
      card.fuelWaiverMonthlyCap !== null ? Math.min(uncapped, card.fuelWaiverMonthlyCap) : uncapped;
    annualFuelSaving = monthlySaving * 12;
  }

  let annualLoungeValue = 0;
  if (preferences.loungePreference !== 'NONE') {
    annualLoungeValue += card.domesticLoungeVisits * DOMESTIC_LOUNGE_VISIT_VALUE;
    if (preferences.loungePreference === 'INTERNATIONAL') {
      annualLoungeValue += card.internationalLoungeVisits * INTERNATIONAL_LOUNGE_VISIT_VALUE;
    }
  }

  const feeWaived = card.feeWaiverSpend !== null && annualSpend >= card.feeWaiverSpend;
  const effectiveAnnualFee = feeWaived ? 0 : card.annualFee;

  return {
    annualSpend,
    annualReward: round(annualReward),
    annualFuelSaving: round(annualFuelSaving),
    annualLoungeValue: round(annualLoungeValue),
    effectiveAnnualFee,
    feeWaived,
    netAnnualValue: round(annualReward + annualFuelSaving - effectiveAnnualFee),
  };
}

/** A hard disqualification, evaluated before any scoring happens. */
function disqualify(card: ScoringCard, preferences: Preferences): string | null {
  if (preferences.excludedIssuers.includes(card.issuer)) {
    return `You asked to exclude ${card.issuer}`;
  }
  if (preferences.age < card.minAge || preferences.age > card.maxAge) {
    return `Age eligibility is ${card.minAge}-${card.maxAge} years`;
  }
  if (preferences.creditScore < card.minCreditScore) {
    return `Requires a credit score of at least ${card.minCreditScore}`;
  }
  const requiredIncome =
    preferences.employmentType === 'SALARIED' ? card.minIncomeSalaried : card.minIncomeSelfEmployed;
  if (preferences.annualIncome < requiredIncome) {
    return `Requires an annual income of at least ₹${requiredIncome.toLocaleString('en-IN')}`;
  }

  const ceiling = FEE_TOLERANCE_CEILING[preferences.feeTolerance];
  const feeWaived =
    card.feeWaiverSpend !== null && preferences.monthlySpend * 12 >= card.feeWaiverSpend;
  const effectiveFee = feeWaived ? 0 : card.annualFee;
  if (ceiling === 0) {
    if (effectiveFee > 0 || card.joiningFee > 0) {
      return 'You asked for cards with no joining or annual fee';
    }
  } else if (effectiveFee > ceiling) {
    return `Annual fee of ₹${effectiveFee.toLocaleString('en-IN')} is above your budget`;
  }

  return null;
}

type RawScores = Record<ScoreFactor, number>;

function computeRawScores(
  card: ScoringCard,
  preferences: Preferences,
  value: ValueEstimate,
): RawScores {
  const split = normaliseSpendSplit(preferences.spendSplit);

  const benchmark = (value.annualSpend * EXCELLENT_RETURN_RATE) / 100;
  const rewardValue = benchmark > 0 ? clamp(value.netAnnualValue / benchmark) : 0;

  let categoryFit: number;
  const splitEntries = Object.entries(split) as [SpendCategory, number][];
  if (splitEntries.length === 0) {
    categoryFit = clamp(card.baseRewardRate / EXCELLENT_RETURN_RATE);
  } else {
    categoryFit = splitEntries.reduce(
      (sum, [category, fraction]) =>
        sum + fraction * clamp(rateForCategory(card, category) / EXCELLENT_RETURN_RATE),
      0,
    );
  }

  const ceiling = FEE_TOLERANCE_CEILING[preferences.feeTolerance];
  const feeFit = ceiling === 0 ? 1 : clamp(1 - value.effectiveAnnualFee / ceiling);

  let loungeFit = 0;
  if (preferences.loungePreference === 'DOMESTIC') {
    loungeFit = clamp(card.domesticLoungeVisits / 8);
  } else if (preferences.loungePreference === 'INTERNATIONAL') {
    loungeFit =
      0.6 * clamp(card.internationalLoungeVisits / 6) + 0.4 * clamp(card.domesticLoungeVisits / 8);
  }

  const requiredIncome =
    preferences.employmentType === 'SALARIED' ? card.minIncomeSalaried : card.minIncomeSelfEmployed;
  const incomeHeadroom =
    requiredIncome > 0 ? clamp(preferences.annualIncome / requiredIncome - 1) : 1;
  const creditHeadroom = clamp((preferences.creditScore - card.minCreditScore) / 100);
  const eligibilityHeadroom = 0.5 * incomeHeadroom + 0.5 * creditHeadroom;

  const forexFit = clamp(
    (WORST_FOREX_MARKUP - card.forexMarkup) / (WORST_FOREX_MARKUP - BEST_FOREX_MARKUP),
  );

  const fuelFit =
    (card.fuelSurchargeWaiver ? 0.6 : 0) +
    0.4 * clamp(rateForCategory(card, 'FUEL') / EXCELLENT_RETURN_RATE);

  const issuerAffinity = preferences.preferredIssuers.includes(card.issuer) ? 1 : 0;

  const welcomeValue = (card.welcomeBenefit ? 0.6 : 0) + (card.milestoneBenefit ? 0.4 : 0);

  const reputation = 0.6 * clamp(card.rating / 5) + 0.4 * clamp(card.popularity / 100);

  const rewardTypeMatches =
    preferences.rewardPreference === 'ANY' || preferences.rewardPreference === card.rewardType;

  return {
    // A mismatched reward currency is a soft penalty, not a disqualification.
    rewardValue: rewardTypeMatches ? rewardValue : rewardValue * 0.75,
    categoryFit: rewardTypeMatches ? categoryFit : categoryFit * 0.75,
    feeFit,
    loungeFit,
    eligibilityHeadroom,
    forexFit,
    fuelFit,
    issuerAffinity,
    welcomeValue,
    reputation,
  };
}

const FACTOR_LABELS: Record<ScoreFactor, string> = {
  rewardValue: 'strong net annual value at your spend level',
  categoryFit: 'accelerated rewards on the categories you spend most on',
  feeFit: 'a fee that sits comfortably inside your budget',
  loungeFit: 'the airport lounge access you asked for',
  eligibilityHeadroom: 'comfortable approval odds on your profile',
  forexFit: 'a low forex markup for international spending',
  fuelFit: 'fuel surcharge waiver and fuel rewards',
  issuerAffinity: 'an issuer you already prefer',
  welcomeValue: 'a welcome and milestone benefit worth claiming',
  reputation: 'a strong track record with Indian cardholders',
};

function buildReasons(
  card: ScoringCard,
  breakdown: FactorBreakdown[],
  value: ValueEstimate,
): string[] {
  const reasons = breakdown
    .filter((factor) => factor.weight > 0 && factor.raw >= 0.5)
    .sort((a, b) => b.points - a.points || a.factor.localeCompare(b.factor))
    .slice(0, 3)
    .map((factor) => FACTOR_LABELS[factor.factor]);

  if (value.netAnnualValue > 0) {
    reasons.push(
      `we estimate about ₹${Math.round(value.netAnnualValue).toLocaleString('en-IN')} of net value a year`,
    );
  }
  if (value.feeWaived && card.annualFee > 0) {
    reasons.push('your spending clears the annual fee waiver threshold');
  }
  return reasons;
}

export interface RecommendOptions {
  limit?: number;
}

/**
 * Scores every card against the supplied preferences and returns a deterministic ranking.
 * Ties are broken by popularity and then by slug so ordering is always stable.
 */
export function recommend(
  cards: readonly ScoringCard[],
  preferences: Preferences,
  options: RecommendOptions = {},
): RecommendationResult {
  const limit = options.limit ?? 5;
  const weights = resolveWeights(preferences);
  const rejected: RejectedCard[] = [];
  const scored: (ScoredCard & { popularity: number })[] = [];

  for (const card of cards) {
    const reason = disqualify(card, preferences);
    if (reason !== null) {
      rejected.push({ cardId: card.id, slug: card.slug, reason });
      continue;
    }

    const value = estimateAnnualValue(card, preferences);
    const raws = computeRawScores(card, preferences, value);

    const breakdown: FactorBreakdown[] = (Object.keys(weights) as ScoreFactor[])
      .map((factor) => ({
        factor,
        raw: round(raws[factor], 4),
        weight: round(weights[factor]),
        points: round(raws[factor] * weights[factor]),
      }))
      .sort((a, b) => a.factor.localeCompare(b.factor));

    const score = round(breakdown.reduce((sum, factor) => sum + factor.points, 0));

    scored.push({
      cardId: card.id,
      slug: card.slug,
      rank: 0,
      score,
      breakdown,
      reasons: buildReasons(card, breakdown, value),
      estimatedAnnualValue: value.netAnnualValue,
      estimatedAnnualReward: value.annualReward,
      effectiveAnnualFee: value.effectiveAnnualFee,
      popularity: card.popularity,
    });
  }

  scored.sort(
    (a, b) => b.score - a.score || b.popularity - a.popularity || a.slug.localeCompare(b.slug),
  );

  const recommendations = scored
    .slice(0, limit)
    .map(({ popularity: _popularity, ...card }, index) => ({
      ...card,
      rank: index + 1,
    }));

  return {
    engineVersion: ENGINE_VERSION,
    recommendations,
    rejected,
    evaluated: cards.length,
  };
}
