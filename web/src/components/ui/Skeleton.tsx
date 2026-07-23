import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'relative overflow-hidden rounded-xl bg-ink-200/70 dark:bg-ink-800',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer',
        'after:bg-gradient-to-r after:from-transparent after:via-white/25 after:to-transparent',
        className,
      )}
    />
  );
}
