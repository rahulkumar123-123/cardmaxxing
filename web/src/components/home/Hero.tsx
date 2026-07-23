import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { FannedStack } from './FannedStack';
import type { Card } from '@/types';

export function Hero({ cards, cardCount }: { cards?: Card[]; cardCount: number }) {
  return (
    <section className="relative overflow-hidden border-b border-ink-200 dark:border-ink-800">
      <div
        className="absolute inset-0 bg-grid-light bg-[size:56px_56px] dark:bg-grid-dark"
        aria-hidden
      />
      <div
        className="absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px] dark:bg-indigo-600/25"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:py-28">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {cardCount}+ Indian credit cards, scored transparently
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="mt-6 text-4xl font-bold leading-[1.08] text-ink-900 sm:text-5xl lg:text-6xl dark:text-white"
          >
            Stop guessing which{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-marigold-400 bg-clip-text text-transparent">
              credit card
            </span>{' '}
            actually pays you back.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600 dark:text-ink-300"
          >
            Tell us how you spend. A deterministic scoring engine — not a black box — ranks every
            card on the rupee value it returns to you, and shows its full working.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              to="/recommend"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 text-base font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Find my card
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/cards"
              className="inline-flex h-13 items-center justify-center rounded-xl border border-ink-200 bg-white px-7 text-base font-medium text-ink-800 transition-colors hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 dark:hover:bg-ink-800"
            >
              Browse all cards
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.34 }}
            className="mt-6 inline-flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
            No sign-up needed. We never sell your data or take issuer commissions.
          </motion.p>
        </div>

        <FannedStack cards={cards} />
      </div>
    </section>
  );
}
