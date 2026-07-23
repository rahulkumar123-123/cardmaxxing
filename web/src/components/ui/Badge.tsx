import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'default' | 'indigo' | 'marigold' | 'success' | 'muted';

const TONES: Record<Tone, string> = {
  default: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  marigold: 'bg-marigold-100 text-marigold-800 dark:bg-marigold-900/40 dark:text-marigold-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  muted:
    'bg-transparent text-ink-500 ring-1 ring-inset ring-ink-200 dark:text-ink-400 dark:ring-ink-700',
};

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
