import { Link } from 'react-router-dom';
import { Check, Minus, X } from 'lucide-react';
import { CardFace } from './CardFace';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { formatFee, formatInr, formatPercent } from '@/lib/format';
import type { Card } from '@/types';

type Row = {
  label: string;
  /** Higher is better, lower is better, or not comparable. */
  better?: 'high' | 'low';
  value: (card: Card) => string | number | boolean | null;
  render?: (card: Card) => string;
};

const ROWS: { section: string; rows: Row[] }[] = [
  {
    section: 'Fees',
    rows: [
      {
        label: 'Joining fee',
        better: 'low',
        value: (c) => c.joiningFee,
        render: (c) => formatFee(c.joiningFee),
      },
      {
        label: 'Annual fee',
        better: 'low',
        value: (c) => c.annualFee,
        render: (c) => formatFee(c.annualFee),
      },
      {
        label: 'Fee waiver spend',
        better: 'low',
        value: (c) => c.feeWaiverSpend,
        render: (c) => (c.feeWaiverSpend === null ? 'Not available' : formatInr(c.feeWaiverSpend)),
      },
      {
        label: 'Forex markup',
        better: 'low',
        value: (c) => c.forexMarkup,
        render: (c) => formatPercent(c.forexMarkup),
      },
    ],
  },
  {
    section: 'Rewards',
    rows: [
      {
        label: 'Reward type',
        value: (c) => c.rewardType,
        render: (c) => c.rewardType.toLowerCase(),
      },
      {
        label: 'Base rate',
        better: 'high',
        value: (c) => c.baseRewardRate,
        render: (c) => formatPercent(c.baseRewardRate),
      },
      {
        label: 'Monthly reward cap',
        better: 'high',
        value: (c) => c.cappedMonthlyReward,
        render: (c) =>
          c.cappedMonthlyReward === null ? 'Uncapped' : formatInr(c.cappedMonthlyReward),
      },
      {
        label: 'Welcome benefit',
        value: (c) => c.welcomeBenefit,
        render: (c) => c.welcomeBenefit ?? '—',
      },
      {
        label: 'Milestone benefit',
        value: (c) => c.milestoneBenefit,
        render: (c) => c.milestoneBenefit ?? '—',
      },
    ],
  },
  {
    section: 'Travel & lifestyle',
    rows: [
      {
        label: 'Domestic lounge visits',
        better: 'high',
        value: (c) => c.domesticLoungeVisits,
        render: (c) =>
          c.domesticLoungeVisits >= 99 ? 'Unlimited' : String(c.domesticLoungeVisits),
      },
      {
        label: 'International lounge visits',
        better: 'high',
        value: (c) => c.internationalLoungeVisits,
        render: (c) =>
          c.internationalLoungeVisits >= 99 ? 'Unlimited' : String(c.internationalLoungeVisits),
      },
      { label: 'Golf privileges', value: (c) => c.golfBenefit },
      { label: 'Concierge', value: (c) => c.conciergeService },
      { label: 'Fuel surcharge waiver', value: (c) => c.fuelSurchargeWaiver },
    ],
  },
  {
    section: 'Eligibility',
    rows: [
      {
        label: 'Min income (salaried)',
        better: 'low',
        value: (c) => c.minIncomeSalaried,
        render: (c) => formatInr(c.minIncomeSalaried),
      },
      {
        label: 'Min income (self-employed)',
        better: 'low',
        value: (c) => c.minIncomeSelfEmployed,
        render: (c) => formatInr(c.minIncomeSelfEmployed),
      },
      { label: 'Min credit score', better: 'low', value: (c) => c.minCreditScore },
      { label: 'Age range', value: (c) => `${c.minAge}–${c.maxAge}` },
    ],
  },
];

/** Finds which cards hold the best value for a row, so winners can be highlighted. */
function bestIndices(cards: Card[], row: Row): Set<number> {
  if (!row.better) return new Set();
  const numeric = cards.map((card) => {
    const value = row.value(card);
    return typeof value === 'number' ? value : null;
  });
  const present = numeric.filter((value): value is number => value !== null);
  if (present.length < 2) return new Set();

  const target = row.better === 'high' ? Math.max(...present) : Math.min(...present);
  const winners = new Set<number>();
  numeric.forEach((value, index) => {
    if (value === target) winners.add(index);
  });
  return winners.size === cards.length ? new Set() : winners;
}

export function CompareTable({
  cards,
  onRemove,
}: {
  cards: Card[];
  onRemove?: (slug: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">
          Side-by-side comparison of {cards.length} credit cards
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="w-44 p-3 text-left align-bottom text-xs uppercase tracking-wide text-ink-400"
            >
              Feature
            </th>
            {cards.map((card) => (
              <th key={card.id} scope="col" className="p-3 align-bottom">
                <div className="relative mx-auto max-w-[180px] space-y-2">
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(card.slug)}
                      aria-label={`Remove ${card.name} from comparison`}
                      className="absolute -right-1 -top-1 z-10 rounded-full bg-ink-900 p-1 text-white dark:bg-ink-700"
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  )}
                  <CardFace card={card} compact />
                  <p className="text-xs font-medium text-ink-400">{card.issuer}</p>
                  <Link
                    to={`/cards/${card.slug}`}
                    className="block text-sm font-semibold text-ink-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                  >
                    {card.name}
                  </Link>
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => window.open(card.officialUrl, '_blank', 'noopener,noreferrer')}
                  >
                    Apply
                  </Button>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {ROWS.map((group) => (
          <tbody key={group.section}>
            <tr>
              <th
                colSpan={cards.length + 1}
                scope="colgroup"
                className="bg-ink-100 px-3 py-2 text-left font-display text-xs font-semibold uppercase tracking-wide text-ink-600 dark:bg-ink-800 dark:text-ink-300"
              >
                {group.section}
              </th>
            </tr>
            {group.rows.map((row) => {
              const winners = bestIndices(cards, row);
              return (
                <tr key={row.label} className="border-b border-ink-100 dark:border-ink-800">
                  <th
                    scope="row"
                    className="p-3 text-left font-medium text-ink-500 dark:text-ink-400"
                  >
                    {row.label}
                  </th>
                  {cards.map((card, index) => {
                    const raw = row.value(card);
                    return (
                      <td
                        key={card.id}
                        className={cn(
                          'p-3 text-center',
                          winners.has(index)
                            ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                            : 'text-ink-800 dark:text-ink-200',
                        )}
                      >
                        {typeof raw === 'boolean' ? (
                          raw ? (
                            <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="Yes" />
                          ) : (
                            <Minus className="mx-auto h-4 w-4 text-ink-300" aria-label="No" />
                          )
                        ) : (
                          <span className={cn(typeof raw === 'number' && 'numeric')}>
                            {row.render ? row.render(card) : String(raw ?? '—')}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
