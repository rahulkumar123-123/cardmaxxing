import { useState } from 'react';
import { Link } from 'react-router-dom';
import { History as HistoryIcon, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { formatDate, formatInrCompact, humanise } from '@/lib/format';

export function HistoryPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => api.history.list(page), [page]);

  const remove = async (id: string): Promise<void> => {
    await api.history.remove(id);
    reload();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ink-900 dark:text-white">Recommendation history</h1>
        <p className="mt-2 text-ink-500 dark:text-ink-400">
          Every run is stored with the exact preferences that produced it, so you can re-check the
          reasoning later.
        </p>
      </header>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Couldn’t load your history" description={error} />
      ) : data && data.items.length > 0 ? (
        <>
          <div className="space-y-5">
            {data.items.map((run) => (
              <article key={run.id} className="surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900 dark:text-white">
                      {formatDate(run.createdAt)}
                    </p>
                    <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                      {formatInrCompact(run.preferences.monthlySpend)}/month ·{' '}
                      {humanise(run.preferences.feeTolerance)} fee tolerance ·{' '}
                      {humanise(run.preferences.loungePreference)} lounge · engine v
                      {run.engineVersion}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {run.aiGenerated && <Badge tone="indigo">AI explained</Badge>}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void remove(run.id)}
                      aria-label={`Delete recommendation run from ${formatDate(run.createdAt)}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>

                <ol className="mt-4 space-y-2">
                  {run.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-4 text-sm">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="numeric w-5 shrink-0 text-ink-400">#{item.rank}</span>
                        <Link
                          to={`/cards/${item.card.slug}`}
                          className="truncate font-medium text-ink-800 hover:text-indigo-600 dark:text-ink-100 dark:hover:text-indigo-400"
                        >
                          {item.card.name}
                        </Link>
                      </span>
                      <span className="numeric shrink-0 text-ink-500 dark:text-ink-400">
                        {item.score.toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ol>

                {run.explanation && (
                  <p className="mt-4 border-t border-ink-100 pt-4 text-sm leading-relaxed text-ink-600 dark:border-ink-800 dark:text-ink-300">
                    {run.explanation}
                  </p>
                )}
              </article>
            ))}
          </div>

          {data.totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="numeric px-3 text-sm text-ink-500">
                Page {data.page} of {data.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      ) : (
        <EmptyState
          icon={<HistoryIcon className="h-10 w-10" />}
          title="No runs yet"
          description="Recommendations you generate while signed in will be saved here."
          action={
            <Link to="/recommend">
              <Button>Get a recommendation</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
