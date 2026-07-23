import { Link } from 'react-router-dom';
import { GitCompare } from 'lucide-react';
import { CompareTable } from '@/components/cards/CompareTable';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { MAX_COMPARE, useCompareStore } from '@/stores/compare';

export function ComparePage() {
  const slugs = useCompareStore((state) => state.slugs);
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);

  const key = slugs.join(',');
  const { data, loading, error } = useAsync(
    () => (slugs.length >= 2 ? api.cards.compare(slugs) : Promise.resolve({ cards: [] })),
    [key],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink-900 dark:text-white">Compare cards</h1>
          <p className="mt-2 text-ink-500 dark:text-ink-400">
            Up to {MAX_COMPARE} cards side by side. The better value in each row is highlighted.
          </p>
        </div>
        {slugs.length > 0 && (
          <Button variant="secondary" size="sm" onClick={clear}>
            Clear all
          </Button>
        )}
      </header>

      {slugs.length < 2 ? (
        <EmptyState
          icon={<GitCompare className="h-10 w-10" />}
          title="Pick at least two cards"
          description="Add cards to the comparison tray from the catalogue or any card page."
          action={
            <Link to="/cards">
              <Button>Browse cards</Button>
            </Link>
          }
        />
      ) : loading ? (
        <Skeleton className="h-[600px] w-full" />
      ) : error ? (
        <EmptyState title="Couldn’t load the comparison" description={error} />
      ) : data && data.cards.length >= 2 ? (
        <div className="surface p-2 sm:p-4">
          <CompareTable cards={data.cards} onRemove={remove} />
        </div>
      ) : (
        <EmptyState title="Nothing to compare" description="Those cards are no longer available." />
      )}
    </div>
  );
}
