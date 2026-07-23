import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { useAuthStore } from '@/stores/auth';
import { useFavoritesStore } from '@/stores/favorites';

export function App() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const user = useAuthStore((state) => state.user);
  const loadFavorites = useFavoritesStore((state) => state.load);
  const favoritesLoaded = useFavoritesStore((state) => state.loaded);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (user && !favoritesLoaded) void loadFavorites();
  }, [user, favoritesLoaded, loadFavorites]);

  return <RouterProvider router={router} />;
}
