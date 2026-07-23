import { motion } from 'framer-motion';
import { SCENARIOS } from '@/lib/scenarios';
import { cn } from '@/lib/cn';

export function ScenarioChips({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div
      className="flex flex-wrap justify-center gap-2"
      role="group"
      aria-label="Filter cards by scenario"
    >
      {SCENARIOS.map((scenario, index) => {
        const Icon = scenario.icon;
        const active = selected === scenario.id;
        return (
          <motion.button
            key={scenario.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.5 + index * 0.05 }}
            onClick={() => onSelect(active ? null : scenario.id)}
            aria-pressed={active}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-ink-200 bg-white text-ink-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:border-indigo-700',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {scenario.label}
          </motion.button>
        );
      })}
    </div>
  );
}
