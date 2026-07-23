import { cn } from '@/lib/cn';
import { cardGradient } from '@/lib/format';
import type { Card } from '@/types';

const NETWORK_LABEL: Record<Card['network'], string> = {
  VISA: 'VISA',
  MASTERCARD: 'Mastercard',
  RUPAY: 'RuPay',
  AMEX: 'AMEX',
  DINERS: 'Diners Club',
};

/**
 * Renders a card visual. Uses the issuer's artwork when `imageUrl` is populated and
 * otherwise falls back to a deterministic CSS-drawn face, so the grid never shows holes.
 */
export function CardFace({
  card,
  className,
  compact = false,
}: {
  card: Pick<Card, 'slug' | 'name' | 'issuer' | 'network' | 'imageUrl' | 'tier'>;
  className?: string;
  compact?: boolean;
}) {
  if (card.imageUrl) {
    return (
      <img
        src={card.imageUrl}
        alt={`${card.name} card face`}
        loading="lazy"
        className={cn('card-face w-full object-cover', className)}
      />
    );
  }

  return (
    <div
      className={cn('card-face w-full', className)}
      style={{ background: cardGradient(card.slug) }}
      role="img"
      aria-label={`${card.name} from ${card.issuer}`}
    >
      <div className="flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between">
          <span
            className={cn(
              'font-display font-semibold text-white/90',
              compact ? 'text-[11px]' : 'text-sm',
            )}
          >
            {card.issuer}
          </span>
          <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/80">
            {card.tier.replace('_', ' ')}
          </span>
        </div>

        <div
          className={cn(
            'h-7 w-9 rounded-md bg-gradient-to-br from-marigold-200 to-marigold-500',
            compact && 'h-5 w-7',
          )}
          aria-hidden
        >
          <div className="mx-auto mt-1 h-px w-6 bg-marigold-700/40" />
          <div className="mx-auto mt-1 h-px w-6 bg-marigold-700/40" />
        </div>

        <div>
          <p className={cn('font-mono text-white/60', compact ? 'text-[9px]' : 'text-[11px]')}>
            •••• •••• •••• 4242
          </p>
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <p
              className={cn(
                'font-display font-semibold leading-tight text-white',
                compact ? 'text-[11px]' : 'text-sm',
              )}
            >
              {card.name}
            </p>
            <span
              className={cn(
                'shrink-0 font-display italic text-white/80',
                compact ? 'text-[10px]' : 'text-xs',
              )}
            >
              {NETWORK_LABEL[card.network]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
