import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { CardTile } from '@/components/cards/CardTile';
import { FilterRail } from '@/components/cards/FilterRail';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useCompareStore } from '@/stores/compare';
import { useFavoritesStore } from '@/stores/favorites';
import type { CardFilters } from '@/types';

const SORTS = [
  { value: 'popularity', label: 'Most popular' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'annualFee', label: 'Lowest annual fee' },
  { value: 'annualFeeDesc', label: 'Highest annual fee' },
  { value: 'rewardRate', label: 'Best base rewards' },
  { value: 'name', label: 'Name (A–Z)' },
];

const ARRAY_KEYS = ['issuer', 'category', 'tier', 'network', 'tags'] as const;

/** URL search params are the single source of truth so filtered views are shareable. */
function paramsToFilters(params: URLSearchParams): CardFilters {
  const filters: CardFilters = {
    q: params.get('q') ?? undefined,
    sort: (params.get('sort') as CardFilters['sort']) ?? 'popularity',
    page: Number(params.get('page') ?? '1'),
    pageSize: 12,
  };
  for (const key of ARRAY_KEYS) {
    const value = params.get(key);
    if (value) Object.assign(filters, { [key]: value.split(',') });
  }
  if (params.get('maxAnnualFee')) filters.maxAnnualFee = Number(params.get('maxAnnualFee'));
  if (params.get('lifetimeFree')) filters.lifetimeFree = true;
  if (params.get('loungeAccess')) filters.loungeAccess = true;
  if (params.get('fuelSurchargeWaiver')) filters.fuelSurchargeWaiver = true;
  return filters;
}

function filtersToParams(filters: CardFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '' || key === 'pageSize') continue;
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(','));
    } else if (!(key === 'page' && value === 1) && !(key === 'sort' && value === 'popularity')) {
      params.set(key, String(value));
    }
  }
  return params;
}

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const filters = useMemo(() => paramsToFilters(searchParams), [searchParams]);
  const [searchTerm, setSearchTerm] = useState(filters.q ?? '');
  const debouncedSearch = useDebounce(searchTerm);

  const user = useAuthStore((state) => state.user);
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggle);
  const comparing = useCompareStore((state) => state.slugs);
  const toggleCompare = useCompareStore((state) => state.toggle);

  const applyFilters = useCallback(
    (next: CardFilters) => setSearchParams(filtersToParams(next), { replace: true }),
    [setSearchParams],
  );

  useEffect(() => {
    if ((filters.q ?? '') === debouncedSearch) return;
    applyFilters({ ...filters, q: debouncedSearch || undefined, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const key = searchParams.toString();
  const result = useAsync(() => api.cards.list(filters), [key]);
  const facets = useAsync(() => api.cards.facets(), []);

  const handleFavorite = (cardId: string): void => {
    if (!user) {
      window.location.assign('/login?next=/cards');
      return;
    }
    void toggleFavorite(cardId);
  };

  const totalPages = result.data?.totalPages ?? 0;
  const page = filters.page ?? 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ink-900 dark:text-white">Explore credit cards</h1>
        <p className="mt-2 text-ink-500 dark:text-ink-400">
          Every card in the catalogue, filterable by fee, benefit and issuer.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <Input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by card name, issuer or benefit…"
            aria-label="Search cards"
            className="pl-10"
          />
        </div>
        <Select
          aria-label="Sort cards"
          options={SORTS}
          value={filters.sort}
          onChange={(event) =>
            applyFilters({ ...filters, sort: event.target.value as CardFilters['sort'], page: 1 })
          }
          className="sm:w-56"
        />
        <Button variant="secondary" onClick={() => setShowFilters(true)} className="lg:hidden">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filters
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <div className="hidden lg:block">
          <FilterRail
            facets={facets.data}
            filters={filters}
            onChange={applyFilters}
            resultCount={result.data?.total ?? 0}
          />
        </div>

        {showFilters && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowFilters(false)}
              aria-hidden
            />
            <div className="absolute inset-y-0 right-0 w-[min(360px,90vw)] overflow-y-auto bg-white p-5 dark:bg-ink-950">
              <div className="mb-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(false)}
                  aria-label="Close filters"
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              <FilterRail
                facets={facets.data}
                filters={filters}
                onChange={applyFilters}
                resultCount={result.data?.total ?? 0}
              />
            </div>
          </div>
        )}

        <div>
          {result.loading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-[420px]" />
              ))}
            </div>
          ) : result.error ? (
            <EmptyState
              title="Couldn’t load the catalogue"
              description={result.error}
              action={<Button onClick={result.reload}>Retry</Button>}
            />
          ) : result.data && result.data.items.length > 0 ? (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {result.data.items.map((card, index) => (
                  <CardTile
                    key={card.id}
                    card={card}
                    index={index}
                    isFavorite={favorites.some((favorite) => favorite.cardId === card.id)}
                    isComparing={comparing.includes(card.slug)}
                    onToggleFavorite={handleFavorite}
                    onToggleCompare={toggleCompare}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <nav
                  className="mt-10 flex items-center justify-center gap-2"
                  aria-label="Pagination"
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => applyFilters({ ...filters, page: page - 1 })}
                  >
                    Previous
                  </Button>
                  <span className="numeric px-3 text-sm text-ink-500 dark:text-ink-400">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => applyFilters({ ...filters, page: page + 1 })}
                  >
                    Next
                  </Button>
                </nav>
              )}
            </>
          ) : (
            <EmptyState
              title="No cards match those filters"
              description="Try widening the fee range or clearing a filter or two."
              action={
                <Button onClick={() => applyFilters({ sort: 'popularity', page: 1 })}>
                  Clear filters
                </Button>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
