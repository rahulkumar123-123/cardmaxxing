import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 px-6 py-16 text-center dark:border-ink-700">
      {icon && (
        <div className="mb-4 text-ink-400" aria-hidden>
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-ink-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-ink-500 dark:text-ink-400">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
