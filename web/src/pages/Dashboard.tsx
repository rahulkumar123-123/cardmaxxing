import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Heart, History, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { formatInrCompact, humanise } from '@/lib/format';
import { useAuthStore } from '@/stores/auth';
import { useFavoritesStore } from '@/stores/favorites';

const CHART_COLORS = ['#4F46E5', '#F5A623', '#818CF8', '#FDB022', '#3730A3', '#B6650B'];

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { favorites, loaded, load } = useFavoritesStore();
  const history = useAsync(() => api.history.list(1, 5), []);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  /** Fee distribution across saved cards, used for the bar chart. */
  const feeSpread = useMemo(
    () =>
      favorites
        .map((favorite) => ({
          name:
            favorite.card.name.length > 18
              ? `${favorite.card.name.slice(0, 17)}…`
              : favorite.card.name,
          fee: favorite.card.annualFee,
        }))
        .slice(0, 6),
    [favorites],
  );

  const categorySpread = useMemo(() => {
    const counts = new Map<string, number>();
    for (const favorite of favorites) {
      counts.set(favorite.card.category, (counts.get(favorite.card.category) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, value]) => ({ name: humanise(name), value }));
  }, [favorites]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ink-900 dark:text-white">
          {user ? `Hello, ${user.name.split(' ')[0]}` : 'Dashboard'}
        </h1>
        <p className="mt-2 text-ink-500 dark:text-ink-400">
          Your saved cards, recent recommendation runs and how your shortlist breaks down.
        </p>
      </header>

      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        {[
          { label: 'Saved cards', value: favorites.length, icon: Heart, to: '/favorites' },
          {
            label: 'Recommendation runs',
            value: history.data?.total ?? 0,
            icon: History,
            to: '/history',
          },
          {
            label: 'Lifetime-free saved',
            value: favorites.filter((f) => f.card.annualFee === 0 && f.card.joiningFee === 0)
              .length,
            icon: Sparkles,
            to: '/favorites',
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              to={stat.to}
              className="surface flex items-center gap-4 p-5 transition-shadow hover:shadow-lift"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="numeric block text-2xl font-semibold text-ink-900 dark:text-white">
                  {stat.value}
                </span>
                <span className="text-sm text-ink-500 dark:text-ink-400">{stat.label}</span>
              </span>
            </Link>
          );
        })}
      </div>

      {favorites.length === 0 ? (
        <div className="surface p-10 text-center">
          <h2 className="text-lg font-semibold text-ink-900 dark:text-white">
            Your dashboard fills up as you save cards
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500 dark:text-ink-400">
            Run a recommendation or browse the catalogue, then save the cards you want to think
            about.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/recommend">
              <Button>Get a recommendation</Button>
            </Link>
            <Link to="/cards">
              <Button variant="secondary">Browse cards</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="surface p-6">
            <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-white">
              Annual fees on your shortlist
            </h2>
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feeSpread} margin={{ left: -12, right: 8 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    className="text-ink-200 dark:text-ink-800"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    stroke="currentColor"
                    className="text-ink-400"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="currentColor"
                    className="text-ink-400"
                    tickFormatter={(value: number) => formatInrCompact(value)}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatInrCompact(value), 'Annual fee']}
                    contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
                  />
                  <Bar dataKey="fee" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="surface p-6">
            <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-white">
              What kind of cards you save
            </h2>
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySpread}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {categorySpread.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-ink-500 dark:text-ink-400">
              {categorySpread.map((entry, index) => (
                <li key={entry.name} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                    aria-hidden
                  />
                  {entry.name}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-white">
            Recent runs
          </h2>
          <Link to="/history" className="link text-sm">
            View all
          </Link>
        </div>
        {history.loading ? (
          <Skeleton className="h-32" />
        ) : history.data && history.data.items.length > 0 ? (
          <ul className="surface divide-y divide-ink-100 dark:divide-ink-800">
            {history.data.items.map((run) => (
              <li key={run.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink-800 dark:text-ink-100">
                    {run.items[0]?.card.name ?? 'No results'}
                  </span>
                  <span className="text-xs text-ink-500 dark:text-ink-400">
                    {formatInrCompact(run.preferences.monthlySpend)}/month · {run.items.length}{' '}
                    cards ranked
                  </span>
                </span>
                <Link to="/history" className="link shrink-0 text-xs">
                  Details
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="surface p-6 text-sm text-ink-500 dark:text-ink-400">
            No recommendation runs yet.{' '}
            <Link to="/recommend" className="link">
              Try the engine.
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
