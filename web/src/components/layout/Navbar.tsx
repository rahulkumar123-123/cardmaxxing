import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { CreditCard, GitCompare, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth';
import { useCompareStore } from '@/stores/compare';
import { useThemeStore } from '@/stores/theme';
import { useFavoritesStore } from '@/stores/favorites';
import { cn } from '@/lib/cn';

const LINKS = [
  { to: '/cards', label: 'Explore' },
  { to: '/recommend', label: 'Recommend' },
  { to: '/compare', label: 'Compare' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const resetFavorites = useFavoritesStore((state) => state.reset);
  const compareCount = useCompareStore((state) => state.slugs.length);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggle);

  const handleLogout = async (): Promise<void> => {
    await logout();
    resetFavorites();
    navigate('/');
  };

  const linkClass = ({ isActive }: { isActive: boolean }): string =>
    cn(
      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
        : 'text-ink-600 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white',
    );

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200/80 bg-white/85 backdrop-blur-lg dark:border-ink-800/80 dark:bg-ink-950/85">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Main"
      >
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white">
            <CreditCard className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-ink-900 dark:text-white">
            Card<span className="text-indigo-600 dark:text-indigo-400">Maxxing</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
          {user && (
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/compare"
            className="relative hidden rounded-lg p-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800 sm:block"
            aria-label={`Comparison tray, ${compareCount} cards selected`}
          >
            <GitCompare className="h-5 w-5" aria-hidden />
            {compareCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-marigold-400 text-[10px] font-bold text-ink-950">
                {compareCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" aria-hidden />
            ) : (
              <Moon className="h-5 w-5" aria-hidden />
            )}
          </button>

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                to="/dashboard"
                className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                aria-label={`Signed in as ${user.name}`}
              >
                {user.name.charAt(0).toUpperCase()}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleLogout()}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Sign in
              </Button>
              <Button size="sm" onClick={() => navigate('/register')}>
                Get started
              </Button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800 md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-ink-200 px-4 py-3 md:hidden dark:border-ink-800">
          <div className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <NavLink to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>
                  Dashboard
                </NavLink>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-600 dark:text-ink-300"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" fullWidth size="sm" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
                <Button fullWidth size="sm" onClick={() => navigate('/register')}>
                  Get started
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
