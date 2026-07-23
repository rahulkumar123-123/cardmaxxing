import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { CardTile } from '@/components/cards/CardTile';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCompareStore } from '@/stores/compare';
import { useFavoritesStore } from '@/stores/favorites';

export function FavoritesPage() {
  const { favorites, loading, loaded, load, toggle } = useFavoritesStore();
  const comparing = useCompareStore((state) => state.slugs);
  const toggleCompare = useCompareStore((state) => state.toggle);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ink-900 dark:text-white">Saved cards</h1>
        <p className="mt-2 text-ink-500 dark:text-ink-400">
          {favorites.length} {favorites.length === 1 ? 'card' : 'cards'} on your shortlist.
        </p>
      </header>

      {loading && !loaded ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-[420px]" />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-10 w-10" />}
          title="Nothing saved yet"
          description="Tap the heart on any card to keep it here for later."
          action={
            <Link to="/cards">
              <Button>Browse cards</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((favorite, index) => (
            <CardTile
              key={favorite.id}
              card={favorite.card}
              index={index}
              isFavorite
              isComparing={comparing.includes(favorite.card.slug)}
              onToggleFavorite={(cardId) => void toggle(cardId)}
              onToggleCompare={toggleCompare}
            />
          ))}
        </div>
      )}
    </div>
  );
}
