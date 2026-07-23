import { aiEnabled, env } from '../../config/env';
import { logger } from '../../lib/logger';
import type { Preferences, ScoredCard } from '../../domain/types';

/**
 * Optional natural-language layer over the deterministic engine.
 *
 * Hard rule: this module never selects, reorders or filters cards. It receives a ranking
 * that has already been decided and only phrases an explanation for it. If no API key is
 * configured, or the upstream call fails for any reason, the API degrades to the
 * deterministic reasons already attached to each recommendation.
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const TIMEOUT_MS = 12_000;
const MAX_TOKENS = 500;

export interface ExplainInput {
  preferences: Preferences;
  recommendations: (ScoredCard & { name: string; issuer: string })[];
}

export interface ExplainResult {
  explanation: string | null;
  aiGenerated: boolean;
}

function buildPrompt({ preferences, recommendations }: ExplainInput): string {
  const summary = recommendations
    .map(
      (card) =>
        `${card.rank}. ${card.name} (${card.issuer}) — score ${card.score}/100, ` +
        `estimated net annual value ₹${Math.round(card.estimatedAnnualValue)}, ` +
        `matched because: ${card.reasons.join('; ')}`,
    )
    .join('\n');

  const topCategories = Object.entries(preferences.spendSplit)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category.toLowerCase().replace(/_/g, ' '))
    .join(', ');

  return [
    'You are a credit card analyst writing for an Indian consumer.',
    'A deterministic scoring engine has ALREADY chosen and ranked the cards below.',
    'Your only job is to explain that ranking in plain English.',
    'Do not suggest other cards, do not reorder these, do not dispute the ranking.',
    '',
    `User profile: monthly card spend ₹${preferences.monthlySpend.toLocaleString('en-IN')}, ` +
      `top spend categories: ${topCategories || 'general spending'}, ` +
      `fee tolerance: ${preferences.feeTolerance}, ` +
      `lounge preference: ${preferences.loungePreference}, ` +
      `reward preference: ${preferences.rewardPreference}.`,
    '',
    'Engine output:',
    summary,
    '',
    'Write 3 to 4 short sentences explaining why the top card suits this user and how the',
    'runners-up differ. Use rupee figures where helpful. No markdown, no bullet points,',
    'no preamble — just the explanation.',
  ].join('\n');
}

export async function explainRecommendations(input: ExplainInput): Promise<ExplainResult> {
  if (!aiEnabled || input.recommendations.length === 0) {
    return { explanation: null, aiGenerated: false };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY as string,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: buildPrompt(input) }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn('AI explanation request failed', { status: response.status });
      return { explanation: null, aiGenerated: false };
    }

    const payload = (await response.json()) as { content?: { type: string; text?: string }[] };
    const text = payload.content
      ?.filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('')
      .trim();

    if (!text) return { explanation: null, aiGenerated: false };
    return { explanation: text, aiGenerated: true };
  } catch (error) {
    logger.warn('AI explanation unavailable, falling back to deterministic reasons', {
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return { explanation: null, aiGenerated: false };
  } finally {
    clearTimeout(timeout);
  }
}
