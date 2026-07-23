import { useMemo } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { formatInrCompact, humanise } from '@/lib/format';
import type { CardFilters, Facets } from '@/types';

interface FilterRailProps {
  facets: Facets | null;
  filters: CardFilters;
  onChange: (next: CardFilters) => void;
  resultCount: number;
}

const FEE_BANDS = [
  { label: 'Lifetime free', value: 0 },
  { label: 'Under ₹1,000', value: 999 },
  { label: 'Under ₹5,000', value: 5000 },
  { label: 'Any fee', value: undefined },
] as const;

export function FilterRail({ facets, filters, onChange, resultCount }: FilterRailProps) {
  /** Toggles one value inside an array-valued filter, resetting pagination. */
  const toggleMulti = <K extends 'issuer' | 'category' | 'tier' | 'network'>(
    key: K,
    value: string,
  ): void => {
    const current = (filters[key] ?? []) as string[];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next.length ? next : undefined, page: 1 });
  };

  const activeCount = useMemo(() => {
    let count = 0;
    for (const key of ['issuer', 'category', 'tier', 'network'] as const) {
      count += (filters[key] ?? []).length;
    }
    if (filters.maxAnnualFee !== undefined) count += 1;
    if (filters.lifetimeFree) count += 1;
    if (filters.loungeAccess) count += 1;
    if (filters.fuelSurchargeWaiver) count += 1;
    return count;
  }, [filters]);

  const clearAll = (): void =>
    onChange({ q: filters.q, sort: filters.sort, page: 1, pageSize: filters.pageSize });

  const checkbox = (checked: boolean): string =>
    cn(
      'grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors',
      checked ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-ink-300 dark:border-ink-600',
    );

  return (
    <aside className="space-y-6" aria-label="Card filters">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900 dark:text-white">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">
              {activeCount}
            </span>
          )}
        </h2>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear
          </Button>
        )}
      </div>

      <p className="numeric text-sm text-ink-500 dark:text-ink-400">{resultCount} cards match</p>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink-800 dark:text-ink-100">
          Annual fee
        </legend>
        <div className="space-y-1.5">
          {FEE_BANDS.map((band) => {
            const checked =
              band.value === undefined
                ? filters.maxAnnualFee === undefined && !filters.lifetimeFree
                : band.value === 0
                  ? Boolean(filters.lifetimeFree)
                  : filters.maxAnnualFee === band.value && !filters.lifetimeFree;
            return (
              <label
                key={band.label}
                className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-600 dark:text-ink-300"
              >
                <input
                  type="radio"
                  name="fee-band"
                  className="sr-only"
                  checked={checked}
                  onChange={() =>
                    onChange({
                      ...filters,
                      lifetimeFree: band.value === 0 ? true : undefined,
                      maxAnnualFee: band.value === 0 ? undefined : band.value,
                      page: 1,
                    })
                  }
                />
                <span className={cn(checkbox(checked), 'rounded-full')}>
                  {checked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                {band.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink-800 dark:text-ink-100">
          Benefits
        </legend>
        <div className="space-y-1.5">
          {(
            [
              ['loungeAccess', 'Airport lounge access'],
              ['fuelSurchargeWaiver', 'Fuel surcharge waiver'],
            ] as const
          ).map(([key, label]) => {
            const checked = Boolean(filters[key]);
            return (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-600 dark:text-ink-300"
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() =>
                    onChange({ ...filters, [key]: checked ? undefined : true, page: 1 })
                  }
                />
                <span className={checkbox(checked)}>{checked && <CheckMark />}</span>
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {facets && (
        <>
          <FacetGroup
            title="Category"
            options={facets.categories.map((f) => ({ ...f, label: humanise(f.value) }))}
            selected={filters.category ?? []}
            onToggle={(value) => toggleMulti('category', value)}
            checkboxClass={checkbox}
          />
          <FacetGroup
            title="Issuer"
            options={facets.issuers.map((f) => ({ ...f, label: f.value }))}
            selected={filters.issuer ?? []}
            onToggle={(value) => toggleMulti('issuer', value)}
            checkboxClass={checkbox}
            collapsibleAfter={8}
          />
          <FacetGroup
            title="Tier"
            options={facets.tiers.map((f) => ({ ...f, label: humanise(f.value) }))}
            selected={filters.tier ?? []}
            onToggle={(value) => toggleMulti('tier', value)}
            checkboxClass={checkbox}
          />
          <p className="text-xs text-ink-400">
            Annual fees range from {formatInrCompact(facets.annualFee.min)} to{' '}
            {formatInrCompact(facets.annualFee.max)}.
          </p>
        </>
      )}
    </aside>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
      <path
        d="M2.5 6.2 4.8 8.5 9.5 3.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FacetGroup({
  title,
  options,
  selected,
  onToggle,
  checkboxClass,
  collapsibleAfter,
}: {
  title: string;
  options: { value: string; label: string; count: number }[];
  selected: string[];
  onToggle: (value: string) => void;
  checkboxClass: (checked: boolean) => string;
  collapsibleAfter?: number;
}) {
  const visible = collapsibleAfter ? options.slice(0, collapsibleAfter) : options;

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink-800 dark:text-ink-100">{title}</legend>
      <div className="space-y-1.5">
        {visible.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-600 dark:text-ink-300"
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => onToggle(option.value)}
              />
              <span className={checkboxClass(checked)}>{checked && <CheckMark />}</span>
              <span className="flex-1 truncate">{option.label}</span>
              <span className="numeric text-xs text-ink-400">{option.count}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
