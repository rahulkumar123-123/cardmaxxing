import { describe, expect, it } from 'vitest';
import { estimateAnnualValue, normaliseSpendSplit, recommend } from './engine';
import { BASE_WEIGHTS, resolveWeights } from './weights';
import type { Preferences, ScoringCard } from '../../domain/types';

const baseCard: ScoringCard = {
  id: 'card_base',
  slug: 'base-card',
  name: 'Base Card',
  issuer: 'HDFC Bank',
  tier: 'MID',
  joiningFee: 500,
  annualFee: 500,
  feeWaiverSpend: 150000,
  forexMarkup: 3.5,
  minIncomeSalaried: 300000,
  minIncomeSelfEmployed: 400000,
  minAge: 21,
  maxAge: 60,
  minCreditScore: 700,
  rewardType: 'POINTS',
  baseRewardRate: 1,
  rewardMultipliers: {},
  cappedMonthlyReward: null,
  welcomeBenefit: null,
  milestoneBenefit: null,
  domesticLoungeVisits: 0,
  internationalLoungeVisits: 0,
  fuelSurchargeWaiver: false,
  fuelWaiverMonthlyCap: null,
  golfBenefit: false,
  insuranceCoverInr: null,
  conciergeService: false,
  rating: 4,
  popularity: 50,
  tags: [],
};

const card = (overrides: Partial<ScoringCard>): ScoringCard => ({ ...baseCard, ...overrides });

const basePreferences: Preferences = {
  monthlySpend: 50000,
  spendSplit: { DINING: 30, ONLINE_SHOPPING: 40, FUEL: 30 },
  rewardPreference: 'ANY',
  feeTolerance: 'MODERATE',
  loungePreference: 'NONE',
  travelsInternationally: false,
  ownsVehicle: false,
  annualIncome: 1200000,
  creditScore: 780,
  age: 30,
  employmentType: 'SALARIED',
  preferredIssuers: [],
  excludedIssuers: [],
};

const prefs = (overrides: Partial<Preferences>): Preferences => ({
  ...basePreferences,
  ...overrides,
});

describe('normaliseSpendSplit', () => {
  it('converts percentages into fractions summing to one', () => {
    const result = normaliseSpendSplit({ DINING: 30, FUEL: 70 });
    expect(result.DINING).toBeCloseTo(0.3, 10);
    expect(result.FUEL).toBeCloseTo(0.7, 10);
  });

  it('normalises inputs that do not add up to 100', () => {
    const result = normaliseSpendSplit({ DINING: 1, FUEL: 1, TRAVEL: 2 });
    const total = Object.values(result).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 10);
    expect(result.TRAVEL).toBeCloseTo(0.5, 10);
  });

  it('drops zero, negative and non-finite entries', () => {
    const result = normaliseSpendSplit({ DINING: 0, FUEL: -5, TRAVEL: Number.NaN, RENT: 10 });
    expect(Object.keys(result)).toEqual(['RENT']);
  });

  it('returns an empty split when there is nothing to normalise', () => {
    expect(normaliseSpendSplit({})).toEqual({});
  });
});

describe('resolveWeights', () => {
  it('always normalises active weights to exactly 100', () => {
    for (const preferences of [
      basePreferences,
      prefs({ travelsInternationally: true, ownsVehicle: true, loungePreference: 'INTERNATIONAL' }),
      prefs({ preferredIssuers: ['HDFC Bank'] }),
    ]) {
      const total = Object.values(resolveWeights(preferences)).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(100, 6);
    }
  });

  it('zeroes out factors that cannot apply to the user', () => {
    const weights = resolveWeights(
      prefs({ travelsInternationally: false, ownsVehicle: false, loungePreference: 'NONE' }),
    );
    expect(weights.forexFit).toBe(0);
    expect(weights.fuelFit).toBe(0);
    expect(weights.loungeFit).toBe(0);
    expect(weights.rewardValue).toBeGreaterThan(BASE_WEIGHTS.rewardValue);
  });
});

describe('estimateAnnualValue', () => {
  it('applies the base rate across all spend when no multipliers exist', () => {
    const value = estimateAnnualValue(baseCard, prefs({ monthlySpend: 10000 }));
    // 1% of 10,000 x 12 = 1,200 reward; fee waiver not met at 1.2L spend so fee applies.
    expect(value.annualReward).toBe(1200);
    expect(value.feeWaived).toBe(false);
    expect(value.effectiveAnnualFee).toBe(500);
    expect(value.netAnnualValue).toBe(700);
  });

  it('adds accelerated earnings only for categories above the base rate', () => {
    const accelerated = card({ rewardMultipliers: { DINING: 5 } });
    const value = estimateAnnualValue(accelerated, prefs({ monthlySpend: 10000 }));
    // base 100/mo + dining uplift 10,000 * 0.3 * 4% = 120/mo => 220 * 12
    expect(value.annualReward).toBe(2640);
  });

  it('honours the monthly cap on accelerated earnings', () => {
    const capped = card({ rewardMultipliers: { DINING: 5 }, cappedMonthlyReward: 50 });
    const value = estimateAnnualValue(capped, prefs({ monthlySpend: 10000 }));
    // base 100/mo + capped uplift 50/mo => 150 * 12
    expect(value.annualReward).toBe(1800);
  });

  it('waives the annual fee once the spend threshold is cleared', () => {
    const value = estimateAnnualValue(baseCard, prefs({ monthlySpend: 20000 }));
    expect(value.annualSpend).toBe(240000);
    expect(value.feeWaived).toBe(true);
    expect(value.effectiveAnnualFee).toBe(0);
  });

  it('only credits fuel savings when the user drives and the card waives the surcharge', () => {
    const fuelCard = card({ fuelSurchargeWaiver: true, fuelWaiverMonthlyCap: 250 });
    const without = estimateAnnualValue(fuelCard, prefs({ monthlySpend: 10000 }));
    expect(without.annualFuelSaving).toBe(0);

    const with_ = estimateAnnualValue(fuelCard, prefs({ monthlySpend: 10000, ownsVehicle: true }));
    // 1% of (10,000 * 0.3) = 30/mo, under the 250 cap
    expect(with_.annualFuelSaving).toBe(360);
  });

  it('caps the fuel surcharge waiver at the monthly ceiling', () => {
    const fuelCard = card({ fuelSurchargeWaiver: true, fuelWaiverMonthlyCap: 100 });
    const value = estimateAnnualValue(fuelCard, prefs({ monthlySpend: 200000, ownsVehicle: true }));
    expect(value.annualFuelSaving).toBe(1200);
  });

  it('values lounge visits only when the user wants lounge access', () => {
    const loungeCard = card({ domesticLoungeVisits: 8, internationalLoungeVisits: 4 });
    expect(estimateAnnualValue(loungeCard, basePreferences).annualLoungeValue).toBe(0);
    expect(
      estimateAnnualValue(loungeCard, prefs({ loungePreference: 'DOMESTIC' })).annualLoungeValue,
    ).toBe(8000);
    expect(
      estimateAnnualValue(loungeCard, prefs({ loungePreference: 'INTERNATIONAL' }))
        .annualLoungeValue,
    ).toBe(18000);
  });
});

describe('recommend — hard eligibility filters', () => {
  it('rejects cards the user cannot afford the fee on', () => {
    const premium = card({ slug: 'premium', annualFee: 10000, feeWaiverSpend: null });
    const result = recommend([premium], prefs({ feeTolerance: 'LOW' }));
    expect(result.recommendations).toHaveLength(0);
    expect(result.rejected[0]?.reason).toContain('above your budget');
  });

  it('rejects any fee-bearing card when the user demands zero fees', () => {
    const lifetimeFree = card({ slug: 'lff', joiningFee: 0, annualFee: 0, feeWaiverSpend: null });
    const result = recommend([baseCard, lifetimeFree], prefs({ feeTolerance: 'ZERO' }));
    expect(result.recommendations.map((r) => r.slug)).toEqual(['lff']);
  });

  it('rejects cards on income, credit score and age independently', () => {
    const byIncome = card({ minIncomeSalaried: 2400000 });
    expect(recommend([byIncome], prefs({ annualIncome: 600000 })).rejected[0]?.reason).toContain(
      'annual income',
    );

    const byScore = card({ minCreditScore: 800 });
    expect(recommend([byScore], prefs({ creditScore: 690 })).rejected[0]?.reason).toContain(
      'credit score',
    );

    const byAge = card({ minAge: 25, maxAge: 55 });
    expect(recommend([byAge], prefs({ age: 22 })).rejected[0]?.reason).toContain('Age eligibility');
    expect(recommend([byAge], prefs({ age: 60 })).rejected[0]?.reason).toContain('Age eligibility');
  });

  it('uses the self-employed income threshold for self-employed users', () => {
    const strict = card({ minIncomeSalaried: 300000, minIncomeSelfEmployed: 900000 });
    expect(
      recommend([strict], prefs({ annualIncome: 500000, employmentType: 'SALARIED' }))
        .recommendations,
    ).toHaveLength(1);
    expect(
      recommend([strict], prefs({ annualIncome: 500000, employmentType: 'SELF_EMPLOYED' }))
        .rejected,
    ).toHaveLength(1);
  });

  it('honours excluded issuers', () => {
    const result = recommend([baseCard], prefs({ excludedIssuers: ['HDFC Bank'] }));
    expect(result.recommendations).toHaveLength(0);
    expect(result.rejected[0]?.reason).toContain('exclude');
  });
});

describe('recommend — ranking behaviour', () => {
  const catalogue: ScoringCard[] = [
    card({ id: 'a', slug: 'dining-hero', rewardMultipliers: { DINING: 5 }, popularity: 60 }),
    card({
      id: 'b',
      slug: 'online-hero',
      rewardMultipliers: { ONLINE_SHOPPING: 5 },
      popularity: 60,
    }),
    card({ id: 'c', slug: 'plain', popularity: 60 }),
  ];

  it('ranks the card matching the heaviest spend category first', () => {
    const result = recommend(catalogue, prefs({ spendSplit: { ONLINE_SHOPPING: 100 } }));
    expect(result.recommendations[0]?.slug).toBe('online-hero');
    expect(result.recommendations.at(-1)?.slug).toBe('plain');
  });

  it('produces scores on a 0-100 scale with sequential ranks', () => {
    const result = recommend(catalogue, basePreferences);
    for (const item of result.recommendations) {
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
    expect(result.recommendations.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('is deterministic across repeated runs and input orderings', () => {
    const forward = recommend(catalogue, basePreferences);
    const reversed = recommend([...catalogue].reverse(), basePreferences);
    expect(JSON.stringify(forward)).toBe(JSON.stringify(recommend(catalogue, basePreferences)));
    expect(reversed.recommendations.map((r) => r.slug)).toEqual(
      forward.recommendations.map((r) => r.slug),
    );
  });

  it('breaks exact ties by popularity and then slug', () => {
    const tied = [
      card({ id: '1', slug: 'zeta', popularity: 10 }),
      card({ id: '2', slug: 'alpha', popularity: 10 }),
      card({ id: '3', slug: 'beta', popularity: 90 }),
    ];
    const result = recommend(tied, basePreferences);
    expect(result.recommendations.map((r) => r.slug)).toEqual(['beta', 'alpha', 'zeta']);
  });

  it('respects the limit option and reports how many cards were evaluated', () => {
    const result = recommend(catalogue, basePreferences, { limit: 2 });
    expect(result.recommendations).toHaveLength(2);
    expect(result.evaluated).toBe(3);
  });

  it('penalises a mismatched reward currency without disqualifying the card', () => {
    const points = card({ id: 'p', slug: 'points', rewardType: 'POINTS' });
    const cashback = card({ id: 'c', slug: 'cashback', rewardType: 'CASHBACK' });
    const result = recommend([points, cashback], prefs({ rewardPreference: 'CASHBACK' }));
    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations[0]?.slug).toBe('cashback');
  });

  it('reports a factor breakdown whose points sum to the final score', () => {
    const [top] = recommend(catalogue, basePreferences).recommendations;
    expect(top).toBeDefined();
    const sum = top!.breakdown.reduce((total, factor) => total + factor.points, 0);
    expect(sum).toBeCloseTo(top!.score, 1);
  });

  it('explains every recommendation in plain language', () => {
    const result = recommend(catalogue, basePreferences);
    for (const item of result.recommendations) {
      expect(item.reasons.length).toBeGreaterThan(0);
    }
  });

  it('never returns a negative estimated value as a positive score contribution', () => {
    const lossMaker = card({
      slug: 'loss',
      annualFee: 5000,
      feeWaiverSpend: null,
      baseRewardRate: 0.1,
    });
    const [item] = recommend([lossMaker], prefs({ monthlySpend: 5000 })).recommendations;
    expect(item!.estimatedAnnualValue).toBeLessThan(0);
    const rewardFactor = item!.breakdown.find((f) => f.factor === 'rewardValue');
    expect(rewardFactor?.raw).toBe(0);
  });

  it('handles an empty catalogue and zero spend without throwing', () => {
    expect(recommend([], basePreferences).recommendations).toEqual([]);
    expect(() => recommend(catalogue, prefs({ monthlySpend: 0 }))).not.toThrow();
  });
});
