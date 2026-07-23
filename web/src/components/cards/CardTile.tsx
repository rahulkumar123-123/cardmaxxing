import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Plane, Fuel, GitCompare, Star } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { CardFace } from './CardFace';
import { cn } from '@/lib/cn';
import { formatFee, formatPercent } from '@/lib/format';
import type { Card } from '@/types';

interface CardTileProps {
  card: Card;
  index?: number;
  isFavorite?: boolean;
  isComparing?: boolean;
  onToggleFavorite?: (cardId: string) => void;
  onToggleCompare?: (slug: string) => void;
}

export function CardTile({
  card,
  index = 0,
  isFavorite = false,
  isComparing = false,
  onToggleFavorite,
  onToggleCompare,
}: CardTileProps) {
  const lounge = card.domesticLoungeVisits + card.internationalLoungeVisits;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.035, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="surface group flex flex-col overflow-hidden transition-shadow hover:shadow-lift"
    >
      <div className="relative p-4 pb-0">
        <CardFace card={card} />
        <div className="absolute right-6 top-6 flex gap-1.5">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(card.id)}
              aria-label={
                isFavorite
                  ? `Remove ${card.name} from favourites`
                  : `Save ${card.name} to favourites`
              }
              aria-pressed={isFavorite}
              className="rounded-full bg-black/35 p-2 text-white backdrop-blur transition-colors hover:bg-black/55"
            >
              <Heart className={cn('h-4 w-4', isFavorite && 'fill-red-500 text-red-500')} />
            </button>
          )}
          {onToggleCompare && (
            <button
              type="button"
              onClick={() => onToggleCompare(card.slug)}
              aria-label={
                isComparing
                  ? `Remove ${card.name} from comparison`
                  : `Add ${card.name} to comparison`
              }
              aria-pressed={isComparing}
              className={cn(
                'rounded-full p-2 text-white backdrop-blur transition-colors',
                isComparing ? 'bg-indigo-600' : 'bg-black/35 hover:bg-black/55',
              )}
            >
              <GitCompare className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              {card.issuer}
            </p>
            <h3 className="mt-0.5 truncate text-base font-semibold text-ink-900 dark:text-white">
              <Link
                to={`/cards/${card.slug}`}
                className="after:absolute after:inset-0 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                {card.name}
              </Link>
            </h3>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-sm text-ink-500 dark:text-ink-400">
            <Star className="h-3.5 w-3.5 fill-marigold-400 text-marigold-400" aria-hidden />
            <span className="numeric">{card.rating.toFixed(1)}</span>
          </span>
        </div>

        <p className="mt-2 line-clamp-2 flex-1 text-sm text-ink-500 dark:text-ink-400">
          {card.summary}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4 dark:border-ink-800">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-ink-400">Annual fee</dt>
            <dd className="numeric mt-0.5 text-sm font-semibold text-ink-900 dark:text-white">
              {formatFee(card.annualFee)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-ink-400">Base rewards</dt>
            <dd className="numeric mt-0.5 text-sm font-semibold text-ink-900 dark:text-white">
              {formatPercent(card.baseRewardRate)}
            </dd>
          </div>
        </dl>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {lounge > 0 && (
            <Badge tone="indigo">
              <Plane className="mr-1 h-3 w-3" aria-hidden />
              {lounge >= 99 ? 'Unlimited lounge' : `${lounge} lounge visits`}
            </Badge>
          )}
          {card.fuelSurchargeWaiver && (
            <Badge tone="muted">
              <Fuel className="mr-1 h-3 w-3" aria-hidden />
              Fuel waiver
            </Badge>
          )}
          {card.annualFee === 0 && card.joiningFee === 0 && (
            <Badge tone="success">Lifetime free</Badge>
          )}
        </div>
      </div>
    </motion.article>
  );
}
