import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import type { FactorBreakdown, ScoreFactor } from '@/types';

const FACTOR_LABELS: Record<ScoreFactor, string> = {
  rewardValue: 'Net annual value',
  categoryFit: 'Category match',
  feeFit: 'Fee fit',
  loungeFit: 'Lounge access',
  eligibilityHeadroom: 'Approval odds',
  forexFit: 'Forex markup',
  fuelFit: 'Fuel benefits',
  issuerAffinity: 'Preferred issuer',
  welcomeValue: 'Welcome benefits',
  reputation: 'Track record',
};

/**
 * Renders the engine's per-factor breakdown. Each bar shows points earned against the
 * maximum that factor could contribute, which is what makes the score auditable.
 */
export function ScoreBreakdown({
  breakdown,
  className,
}: {
  breakdown: FactorBreakdown[];
  className?: string;
}) {
  const visible = breakdown
    .filter((factor) => factor.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  return (
    <ul className={cn('space-y-3', className)}>
      {visible.map((factor, index) => {
        const pct = factor.weight > 0 ? (factor.points / factor.weight) * 100 : 0;
        return (
          <li key={factor.factor}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-ink-600 dark:text-ink-300">{FACTOR_LABELS[factor.factor]}</span>
              <span className="numeric text-xs text-ink-500 dark:text-ink-400">
                {factor.points.toFixed(1)} / {factor.weight.toFixed(0)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                transition={{ duration: 0.6, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-marigold-400"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ScoreDial({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * 34;

  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle
          cx="40"
          cy="40"
          r="34"
          className="fill-none stroke-ink-200 dark:stroke-ink-800"
          strokeWidth="7"
        />
        <motion.circle
          cx="40"
          cy="40"
          r="34"
          className="fill-none stroke-indigo-600"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - clamped / 100) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="numeric text-lg font-semibold text-ink-900 dark:text-white">
          {Math.round(clamped)}
        </span>
        <span className="text-[9px] uppercase tracking-wider text-ink-400">score</span>
      </div>
    </div>
  );
}
