import { Link } from 'react-router-dom';
import { CreditCard } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">
                <CreditCard className="h-4 w-4" aria-hidden />
              </span>
              <span className="font-display text-base font-bold text-ink-900 dark:text-white">
                CardMaxxing
              </span>
            </div>
            <p className="mt-3 text-sm text-ink-500 dark:text-ink-400">
              A transparent, deterministic way to find the Indian credit card that matches how you
              actually spend.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3" aria-label="Footer">
            <div>
              <h2 className="font-semibold text-ink-900 dark:text-white">Product</h2>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    to="/cards"
                    className="text-ink-500 hover:text-indigo-600 dark:text-ink-400"
                  >
                    Explore cards
                  </Link>
                </li>
                <li>
                  <Link
                    to="/recommend"
                    className="text-ink-500 hover:text-indigo-600 dark:text-ink-400"
                  >
                    Get a recommendation
                  </Link>
                </li>
                <li>
                  <Link
                    to="/compare"
                    className="text-ink-500 hover:text-indigo-600 dark:text-ink-400"
                  >
                    Compare
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="font-semibold text-ink-900 dark:text-white">Account</h2>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    to="/dashboard"
                    className="text-ink-500 hover:text-indigo-600 dark:text-ink-400"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to="/favorites"
                    className="text-ink-500 hover:text-indigo-600 dark:text-ink-400"
                  >
                    Favourites
                  </Link>
                </li>
                <li>
                  <Link
                    to="/history"
                    className="text-ink-500 hover:text-indigo-600 dark:text-ink-400"
                  >
                    History
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-10 border-t border-ink-200 pt-6 dark:border-ink-800">
          <p className="text-xs leading-relaxed text-ink-400">
            CardMaxxing is an independent comparison tool and is not affiliated with any bank or
            card issuer. Fees, reward rates and benefits change frequently — always confirm the
            current terms on the issuer’s official page before applying. Nothing here is financial
            advice.
          </p>
          <p className="mt-3 text-xs text-ink-400">
            © {new Date().getFullYear()} CardMaxxing. Built in India.
          </p>
        </div>
      </div>
    </footer>
  );
}
