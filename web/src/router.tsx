import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { HomePage } from '@/pages/Home';
import { CatalogPage } from '@/pages/Catalog';
import { CardDetailPage } from '@/pages/CardDetail';
import { ComparePage } from '@/pages/Compare';
import { RecommendPage } from '@/pages/Recommend';
import { DashboardPage } from '@/pages/Dashboard';
import { FavoritesPage } from '@/pages/Favorites';
import { HistoryPage } from '@/pages/History';
import { LoginPage } from '@/pages/Login';
import { RegisterPage } from '@/pages/Register';
import { NotFoundPage } from '@/pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'cards', element: <CatalogPage /> },
      { path: 'cards/:slug', element: <CardDetailPage /> },
      { path: 'compare', element: <ComparePage /> },
      { path: 'recommend', element: <RecommendPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'favorites', element: <FavoritesPage /> },
          { path: 'history', element: <HistoryPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
