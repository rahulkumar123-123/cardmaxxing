import type { Card } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { aiEnabled } from '../../config/env';
import type {
  Preferences,
  RecommendationResult,
  ScoredCard,
  ScoringCard,
  SpendSplit,
} from '../../domain/types';
import { recommend } from './engine';
import { explainRecommendations } from '../ai/explainer';

/** Prisma stores rewardMultipliers as JSON; narrow it back to the domain shape. */
function toScoringCard(card: Card): ScoringCard {
  return {
    ...card,
    rewardMultipliers: (card.rewardMultipliers ?? {}) as SpendSplit,
  };
}

export interface RecommendationResponse extends RecommendationResult {
  recommendations: (ScoredCard & { card: Card })[];
  explanation: string | null;
  aiGenerated: boolean;
  aiAvailable: boolean;
  historyId: string | null;
}

export interface RecommendParams {
  preferences: Preferences;
  limit: number;
  explain: boolean;
  userId?: string;
}

export async function generateRecommendations(
  params: RecommendParams,
): Promise<RecommendationResponse> {
  const cards = await prisma.card.findMany({ where: { isActive: true } });
  const cardsById = new Map(cards.map((card) => [card.id, card]));

  // The ranking is decided here, deterministically, before AI is involved at all.
  const result = recommend(cards.map(toScoringCard), params.preferences, { limit: params.limit });

  const enriched = result.recommendations.map((item) => ({
    ...item,
    card: cardsById.get(item.cardId)!,
  }));

  const { explanation, aiGenerated } = params.explain
    ? await explainRecommendations({
        preferences: params.preferences,
        recommendations: enriched.map((item) => ({
          ...item,
          name: item.card.name,
          issuer: item.card.issuer,
        })),
      })
    : { explanation: null, aiGenerated: false };

  let historyId: string | null = null;
  if (params.userId) {
    const history = await prisma.recommendationHistory.create({
      data: {
        userId: params.userId,
        preferences: params.preferences as unknown as object,
        engineVersion: result.engineVersion,
        explanation,
        aiGenerated,
        items: {
          create: enriched.map((item) => ({
            cardId: item.cardId,
            rank: item.rank,
            score: item.score,
            breakdown: item.breakdown as unknown as object,
            reasons: item.reasons,
          })),
        },
      },
    });
    historyId = history.id;
  }

  return {
    ...result,
    recommendations: enriched,
    explanation,
    aiGenerated,
    aiAvailable: aiEnabled,
    historyId,
  };
}
