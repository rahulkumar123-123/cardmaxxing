import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-6xl font-semibold text-indigo-600 dark:text-indigo-400">404</p>
      <h1 className="mt-4 text-2xl font-bold text-ink-900 dark:text-white">Page not found</h1>
      <p className="mt-3 text-ink-500 dark:text-ink-400">
        That link doesn’t point anywhere. The card catalogue is a good place to restart.
      </p>
      <Link to="/cards" className="mt-8">
        <Button size="lg">Browse cards</Button>
      </Link>
    </div>
  );
}
