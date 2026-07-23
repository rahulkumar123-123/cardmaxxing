import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Calculator, Eye, ListChecks } from 'lucide-react';
import { Hero } from '@/components/home/Hero';
import { ScenarioChips } from '@/components/home/ScenarioChips';
import { SCENARIOS } from '@/lib/scenarios';
import { CardTile } from '@/components/cards/CardTile';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { useCompareStore } from '@/stores/compare';

const STEPS = [
  {
    icon: ListChecks,
    title: 'Describe your spending',
    body: 'Monthly spend, the categories it lands in, your fee appetite and lounge needs. Nine inputs, no account required.',
  },
  {
    icon: Calculator,
    title: 'The engine scores every card',
    body: 'Ten weighted factors run over the full catalogue. Same inputs, same output, every single time — no model, no randomness.',
  },
  {
    icon: Eye,
    title: 'See exactly why',
    body: 'Every recommendation ships with its factor breakdown and an estimated rupee value, so you can check the maths yourself.',
  },
];

export function HomePage() {
  const [scenario, setScenario] = useState<string | null>(null);
  const toggleCompare = useCompareStore((state) => state.toggle);
  const comparing = useCompareStore((state) => state.slugs);

  const tags = useMemo(() => SCENARIOS.find((item) => item.id === scenario)?.tags, [scenario]);

  const popular = useAsync(
    () => api.cards.list({ sort: 'popularity', pageSize: 6, tags }),
    [tags?.join(',')],
  );
  const heroCards = useAsync(() => api.cards.list({ sort: 'rating', pageSize: 5 }), []);

  return (
    <>
      <Hero cards={heroCards.data?.items} cardCount={heroCards.data?.total ?? 70} />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-ink-900 dark:text-white">
            What are you optimising for?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-500 dark:text-ink-400">
            Pick a scenario to filter the catalogue instantly, or answer a few questions for a
            properly scored shortlist.
          </p>
        </div>

        <div className="mt-8">
          <ScenarioChips selected={scenario} onSelect={setScenario} />
        </div>

        <div className="mt-12">
          {popular.loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-[420px]" />
              ))}
            </div>
          ) : popular.error ? (
            <EmptyState
              title="Couldn’t load cards"
              description={popular.error}
              action={
                <button type="button" onClick={popular.reload} className="link text-sm">
                  Try again
                </button>
              }
            />
          ) : popular.data && popular.data.items.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {popular.data.items.map((card, index) => (
                <CardTile
                  key={card.id}
                  card={card}
                  index={index}
                  isComparing={comparing.includes(card.slug)}
                  onToggleCompare={toggleCompare}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No cards match that scenario yet"
              description="Try a different filter."
            />
          )}
        </div>

        <div className="mt-10 text-center">
          <Link to="/cards" className="link inline-flex items-center gap-1.5 text-sm font-medium">
            Browse the full catalogue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      <section className="border-y border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-ink-900 dark:text-white">
            A recommendation engine you can audit
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-ink-500 dark:text-ink-400">
            Most comparison sites rank on commission. This one ranks on arithmetic, and shows you
            the arithmetic.
          </p>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="surface p-6"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-ink-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
                    {step.body}
                  </p>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/recommend"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 text-base font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Get my shortlist
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
