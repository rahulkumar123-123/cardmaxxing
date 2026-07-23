import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, GitCompare, Heart } from 'lucide-react';
import { CardFace } from '@/components/cards/CardFace';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatFee, formatInr, formatPercent, humanise } from '@/lib/format';
import { useAuthStore } from '@/stores/auth';
import { useCompareStore } from '@/stores/compare';
import { useFavoritesStore } from '@/stores/favorites';
import type { SpendCategory } from '@/types';

export function CardDetailPage() {
  const { slug = '' } = useParams();
  const { data, loading, error } = useAsync(() => api.cards.get(slug), [slug]);

  const user = useAuthStore((state) => state.user);
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggle);
  const compare = useCompareStore();

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Card not found"
          description={error ?? 'This card may have been retired from the catalogue.'}
          action={
            <Link to="/cards" className="link">
              Back to all cards
            </Link>
          }
        />
      </div>
    );
  }

  const { card } = data;
  const isFavorite = favorites.some((favorite) => favorite.cardId === card.id);
  const multipliers = Object.entries(card.rewardMultipliers) as [SpendCategory, number][];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to="/cards"
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-indigo-600 dark:text-ink-400"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All cards
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[340px_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <CardFace card={card} />
          <div className="mt-5 space-y-2.5">
            <Button
              fullWidth
              onClick={() => window.open(card.officialUrl, '_blank', 'noopener,noreferrer')}
            >
              Apply on {card.issuer}
              <ExternalLink className="h-4 w-4" aria-hidden />
            </Button>
            <div className="flex gap-2.5">
              <Button
                variant="secondary"
                fullWidth
                onClick={() =>
                  user ? void toggleFavorite(card.id) : window.location.assign('/login')
                }
                aria-pressed={isFavorite}
              >
                <Heart
                  className={cn('h-4 w-4', isFavorite && 'fill-red-500 text-red-500')}
                  aria-hidden
                />
                {isFavorite ? 'Saved' : 'Save'}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => compare.toggle(card.slug)}
                aria-pressed={compare.slugs.includes(card.slug)}
              >
                <GitCompare className="h-4 w-4" aria-hidden />
                {compare.slugs.includes(card.slug) ? 'Added' : 'Compare'}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-ink-400">{card.issuer}</p>
          <h1 className="mt-1 text-3xl font-bold text-ink-900 sm:text-4xl dark:text-white">
            {card.name}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-600 dark:text-ink-300">
            {card.summary}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge tone="indigo">{humanise(card.category)}</Badge>
            <Badge tone="marigold">{humanise(card.tier)}</Badge>
            <Badge>{card.network}</Badge>
            {card.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} tone="muted">
                {tag.replace(/-/g, ' ')}
              </Badge>
            ))}
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-200 bg-ink-200 sm:grid-cols-4 dark:border-ink-800 dark:bg-ink-800">
            {[
              ['Joining fee', formatFee(card.joiningFee)],
              ['Annual fee', formatFee(card.annualFee)],
              ['Base rewards', formatPercent(card.baseRewardRate)],
              ['Forex markup', formatPercent(card.forexMarkup)],
            ].map(([label, value]) => (
              <div key={label} className="bg-white p-4 dark:bg-ink-900">
                <dt className="text-xs uppercase tracking-wide text-ink-400">{label}</dt>
                <dd className="numeric mt-1 text-lg font-semibold text-ink-900 dark:text-white">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <section className="mt-10">
            <h2 className="text-xl font-semibold text-ink-900 dark:text-white">
              Why people pick it
            </h2>
            <ul className="mt-4 space-y-2.5">
              {card.highlights.map((highlight) => (
                <li key={highlight} className="flex gap-3 text-ink-600 dark:text-ink-300">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-marigold-400"
                    aria-hidden
                  />
                  {highlight}
                </li>
              ))}
            </ul>
          </section>

          {multipliers.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-semibold text-ink-900 dark:text-white">
                Accelerated categories
              </h2>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                Effective value back, compared with the {formatPercent(card.baseRewardRate)} base
                rate.
              </p>
              <div className="mt-4 space-y-3">
                {multipliers
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, rate]) => (
                    <div key={category}>
                      <div className="flex justify-between text-sm">
                        <span className="text-ink-600 dark:text-ink-300">{humanise(category)}</span>
                        <span className="numeric font-medium text-ink-900 dark:text-white">
                          {formatPercent(rate)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-marigold-400"
                          style={{ width: `${Math.min(100, (rate / 10) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
              {card.cappedMonthlyReward !== null && (
                <p className="mt-4 rounded-xl bg-marigold-50 px-4 py-3 text-sm text-marigold-900 dark:bg-marigold-900/20 dark:text-marigold-200">
                  Accelerated earnings are capped at {formatInr(card.cappedMonthlyReward)} a month —
                  worth checking against your actual spend before you apply.
                </p>
              )}
            </section>
          )}

          <section className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="surface p-5">
              <h3 className="font-semibold text-ink-900 dark:text-white">Benefits</h3>
              <dl className="mt-3 space-y-2 text-sm">
                {[
                  [
                    'Domestic lounge',
                    card.domesticLoungeVisits >= 99
                      ? 'Unlimited'
                      : `${card.domesticLoungeVisits} a year`,
                  ],
                  [
                    'International lounge',
                    card.internationalLoungeVisits >= 99
                      ? 'Unlimited'
                      : `${card.internationalLoungeVisits} a year`,
                  ],
                  ['Fuel surcharge waiver', card.fuelSurchargeWaiver ? 'Yes' : 'No'],
                  ['Golf', card.golfBenefit ? 'Yes' : 'No'],
                  ['Concierge', card.conciergeService ? 'Yes' : 'No'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-ink-500 dark:text-ink-400">{label}</dt>
                    <dd className="text-right font-medium text-ink-800 dark:text-ink-100">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="surface p-5">
              <h3 className="font-semibold text-ink-900 dark:text-white">Eligibility</h3>
              <dl className="mt-3 space-y-2 text-sm">
                {[
                  ['Income (salaried)', formatInr(card.minIncomeSalaried)],
                  ['Income (self-employed)', formatInr(card.minIncomeSelfEmployed)],
                  ['Credit score', `${card.minCreditScore}+`],
                  ['Age', `${card.minAge}–${card.maxAge} years`],
                  [
                    'Fee waiver spend',
                    card.feeWaiverSpend === null ? 'Not available' : formatInr(card.feeWaiverSpend),
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-ink-500 dark:text-ink-400">{label}</dt>
                    <dd className="numeric text-right font-medium text-ink-800 dark:text-ink-100">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {(card.welcomeBenefit || card.milestoneBenefit) && (
            <section className="mt-6 grid gap-6 sm:grid-cols-2">
              {card.welcomeBenefit && (
                <div className="surface p-5">
                  <h3 className="font-semibold text-ink-900 dark:text-white">Welcome benefit</h3>
                  <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
                    {card.welcomeBenefit}
                  </p>
                </div>
              )}
              {card.milestoneBenefit && (
                <div className="surface p-5">
                  <h3 className="font-semibold text-ink-900 dark:text-white">Milestone benefit</h3>
                  <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
                    {card.milestoneBenefit}
                  </p>
                </div>
              )}
            </section>
          )}

          <p className="mt-8 text-xs leading-relaxed text-ink-400">
            Figures are indicative and change often. Confirm the current fees and terms on the
            issuer’s official page before applying.
          </p>
        </div>
      </div>
    </div>
  );
}
