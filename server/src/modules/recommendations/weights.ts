import type { Preferences, ScoreFactor } from '../../domain/types';

/**
 * Base weight of every scoring factor. Factors that are irrelevant to a given user
 * (e.g. forex markup for someone who never travels abroad) are dropped, and the
 * remaining weights are re-normalised to sum to exactly 100. This keeps every
 * recommendation on a comparable 0-100 scale regardless of which factors applied.
 */
export const BASE_WEIGHTS: Record<ScoreFactor, number> = {
  rewardValue: 26,
  categoryFit: 20,
  feeFit: 14,
  loungeFit: 10,
  eligibilityHeadroom: 8,
  forexFit: 6,
  fuelFit: 6,
  issuerAffinity: 4,
  welcomeValue: 3,
  reputation: 3,
};

export const ENGINE_VERSION = '1.0.0';

/** Decides which factors are relevant for this user, then normalises to a 100-point scale. */
export function resolveWeights(preferences: Preferences): Record<ScoreFactor, number> {
  const active: Record<ScoreFactor, number> = { ...BASE_WEIGHTS };

  if (!preferences.travelsInternationally) active.forexFit = 0;
  if (!preferences.ownsVehicle) active.fuelFit = 0;
  if (preferences.loungePreference === 'NONE') active.loungeFit = 0;
  if (preferences.preferredIssuers.length === 0) active.issuerAffinity = 0;

  const total = Object.values(active).reduce((sum, value) => sum + value, 0);
  if (total === 0) return active;

  const normalised = {} as Record<ScoreFactor, number>;
  for (const [factor, weight] of Object.entries(active) as [ScoreFactor, number][]) {
    normalised[factor] = (weight / total) * 100;
  }
  return normalised;
}
