import { Outlet, ScrollRestoration } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}
