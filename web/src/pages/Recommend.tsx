import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ExternalLink, Info, RotateCcw, Sparkles } from 'lucide-react';
import { CardFace } from '@/components/cards/CardFace';
import { ScoreBreakdown, ScoreDial } from '@/components/cards/ScoreBar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { api, ApiError } from '@/lib/api';
import { formatInr, formatInrCompact, humanise } from '@/lib/format';
import { useAuthStore } from '@/stores/auth';
import { SPEND_CATEGORIES, type Preferences, type RecommendationResponse } from '@/types';

const CATEGORY_CHOICES = SPEND_CATEGORIES.filter(
  (category) => category !== 'INSURANCE' && category !== 'RENT',
);

const schema = z.object({
  monthlySpend: z.coerce.number().int().min(1000, 'Enter at least ₹1,000').max(5_000_000),
  annualIncome: z.coerce.number().int().min(100000, 'Enter at least ₹1,00,000').max(500_000_000),
  creditScore: z.coerce.number().int().min(300).max(900),
  age: z.coerce.number().int().min(18, 'You must be at least 18').max(85),
  employmentType: z.enum(['SALARIED', 'SELF_EMPLOYED']),
  rewardPreference: z.enum(['ANY', 'CASHBACK', 'POINTS', 'MILES', 'VOUCHERS']),
  feeTolerance: z.enum(['ZERO', 'LOW', 'MODERATE', 'PREMIUM']),
  loungePreference: z.enum(['NONE', 'DOMESTIC', 'INTERNATIONAL']),
  travelsInternationally: z.boolean(),
  ownsVehicle: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  monthlySpend: 40000,
  annualIncome: 1200000,
  creditScore: 750,
  age: 28,
  employmentType: 'SALARIED',
  rewardPreference: 'ANY',
  feeTolerance: 'MODERATE',
  loungePreference: 'DOMESTIC',
  travelsInternationally: false,
  ownsVehicle: true,
};

const FEE_LABELS = [
  { value: 'ZERO', label: 'No fee at all' },
  { value: 'LOW', label: 'Up to ₹1,000' },
  { value: 'MODERATE', label: 'Up to ₹5,000' },
  { value: 'PREMIUM', label: 'Whatever it takes' },
];

export function RecommendPage() {
  const user = useAuthStore((state) => state.user);
  const [split, setSplit] = useState<Record<string, number>>({
    ONLINE_SHOPPING: 30,
    DINING: 20,
    FUEL: 20,
    GROCERIES: 30,
  });
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, control, formState, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });

  const splitTotal = Object.values(split).reduce((sum, value) => sum + value, 0);

  const onSubmit = async (values: FormValues): Promise<void> => {
    setSubmitting(true);
    setFormError(null);
    try {
      const preferences: Preferences = {
        ...values,
        spendSplit: split,
        preferredIssuers: [],
        excludedIssuers: [],
      };
      const response = await api.recommendations.create(preferences, { limit: 5, explain: true });
      setResult(response);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Could not generate recommendations',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startOver = (): void => {
    setResult(null);
    reset(DEFAULTS);
  };

  if (result) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-ink-900 dark:text-white">Your shortlist</h1>
            <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
              Scored {result.evaluated} cards. {result.rejected.length} were ruled out on
              eligibility or fee limits. Engine v{result.engineVersion}.
            </p>
          </div>
          <Button variant="secondary" onClick={startOver}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Start over
          </Button>
        </header>

        {result.explanation && (
          <div className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/50">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-800 dark:text-indigo-300">
              <Sparkles className="h-4 w-4" aria-hidden />
              In plain English
            </p>
            <p className="text-sm leading-relaxed text-indigo-900 dark:text-indigo-100">
              {result.explanation}
            </p>
            <p className="mt-3 text-xs text-indigo-700/70 dark:text-indigo-300/70">
              Written by AI from the engine’s output. The ranking itself was computed
              deterministically — AI never chooses or reorders cards.
            </p>
          </div>
        )}

        {!user && (
          <p className="mb-6 rounded-xl bg-ink-100 px-4 py-3 text-sm text-ink-600 dark:bg-ink-800 dark:text-ink-300">
            <Link to="/register" className="link font-medium">
              Create an account
            </Link>{' '}
            to save this run to your history.
          </p>
        )}

        <div className="space-y-6">
          {result.recommendations.map((item, index) => (
            <motion.article
              key={item.cardId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="surface overflow-hidden"
            >
              <div className="grid gap-6 p-6 md:grid-cols-[200px_1fr]">
                <div>
                  <CardFace card={item.card} compact />
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    className="mt-3"
                    onClick={() =>
                      window.open(item.card.officialUrl, '_blank', 'noopener,noreferrer')
                    }
                  >
                    Apply
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>

                <div>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone={index === 0 ? 'marigold' : 'muted'}>#{item.rank}</Badge>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                          {item.card.issuer}
                        </span>
                      </div>
                      <h2 className="mt-1.5 text-xl font-semibold text-ink-900 dark:text-white">
                        <Link
                          to={`/cards/${item.card.slug}`}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          {item.card.name}
                        </Link>
                      </h2>
                    </div>
                    <ScoreDial score={item.score} />
                  </div>

                  <dl className="mt-4 grid grid-cols-3 gap-4 rounded-xl bg-ink-50 p-4 dark:bg-ink-800/60">
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-ink-400">
                        Est. rewards / yr
                      </dt>
                      <dd className="numeric mt-0.5 font-semibold text-ink-900 dark:text-white">
                        {formatInrCompact(item.estimatedAnnualReward)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-ink-400">
                        Effective fee
                      </dt>
                      <dd className="numeric mt-0.5 font-semibold text-ink-900 dark:text-white">
                        {item.effectiveAnnualFee === 0
                          ? 'Waived'
                          : formatInr(item.effectiveAnnualFee)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-ink-400">
                        Net value / yr
                      </dt>
                      <dd
                        className={
                          item.estimatedAnnualValue >= 0
                            ? 'numeric mt-0.5 font-semibold text-emerald-600 dark:text-emerald-400'
                            : 'numeric mt-0.5 font-semibold text-red-600 dark:text-red-400'
                        }
                      >
                        {formatInrCompact(item.estimatedAnnualValue)}
                      </dd>
                    </div>
                  </dl>

                  <ul className="mt-4 space-y-1.5 text-sm text-ink-600 dark:text-ink-300">
                    {item.reasons.map((reason) => (
                      <li key={reason} className="flex gap-2">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500"
                          aria-hidden
                        />
                        {reason.charAt(0).toUpperCase() + reason.slice(1)}
                      </li>
                    ))}
                  </ul>

                  <details className="group mt-4">
                    <summary className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      <Info className="h-3.5 w-3.5" aria-hidden />
                      Show the score breakdown
                    </summary>
                    <ScoreBreakdown breakdown={item.breakdown} className="mt-4" />
                  </details>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ink-900 dark:text-white">Find your card</h1>
        <p className="mt-2 text-ink-500 dark:text-ink-400">
          Nine questions. No account needed. The engine scores every card in the catalogue against
          your answers and shows its working.
        </p>
      </header>

      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-8">
        <section className="surface p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-white">
            Your spending
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              type="number"
              label="Monthly card spend (₹)"
              error={formState.errors.monthlySpend?.message}
              {...register('monthlySpend')}
            />
            <Input
              type="number"
              label="Annual income (₹)"
              error={formState.errors.annualIncome?.message}
              {...register('annualIncome')}
            />
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-medium text-ink-700 dark:text-ink-200">
              Where does that spend go?
            </legend>
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
              Rough percentages are fine — we normalise them. Currently {splitTotal}%.
            </p>
            <div className="mt-4 space-y-4">
              {CATEGORY_CHOICES.map((category) => (
                <div key={category}>
                  <div className="flex justify-between text-sm">
                    <label htmlFor={`split-${category}`} className="text-ink-600 dark:text-ink-300">
                      {humanise(category)}
                    </label>
                    <span className="numeric text-ink-500 dark:text-ink-400">
                      {split[category] ?? 0}%
                    </span>
                  </div>
                  <input
                    id={`split-${category}`}
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={split[category] ?? 0}
                    onChange={(event) =>
                      setSplit((current) => ({
                        ...current,
                        [category]: Number(event.target.value),
                      }))
                    }
                    className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-200 accent-indigo-600 dark:bg-ink-700"
                  />
                </div>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="surface p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-white">
            Your preferences
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select
              label="How much annual fee is acceptable?"
              options={FEE_LABELS}
              {...register('feeTolerance')}
            />
            <Select
              label="Preferred reward currency"
              options={[
                { value: 'ANY', label: 'No preference' },
                { value: 'CASHBACK', label: 'Cashback' },
                { value: 'POINTS', label: 'Reward points' },
                { value: 'MILES', label: 'Air miles' },
                { value: 'VOUCHERS', label: 'Vouchers' },
              ]}
              {...register('rewardPreference')}
            />
            <Select
              label="Airport lounge access"
              options={[
                { value: 'NONE', label: 'Not important' },
                { value: 'DOMESTIC', label: 'Domestic lounges' },
                { value: 'INTERNATIONAL', label: 'International lounges' },
              ]}
              {...register('loungePreference')}
            />
            <Select
              label="Employment"
              options={[
                { value: 'SALARIED', label: 'Salaried' },
                { value: 'SELF_EMPLOYED', label: 'Self-employed' },
              ]}
              {...register('employmentType')}
            />
          </div>

          <div className="mt-6 space-y-4">
            <Controller
              control={control}
              name="travelsInternationally"
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                  label="I spend abroad or on international websites"
                  description="Brings forex markup into the scoring."
                />
              )}
            />
            <Controller
              control={control}
              name="ownsVehicle"
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                  label="I buy fuel regularly"
                  description="Brings the fuel surcharge waiver into the scoring."
                />
              )}
            />
          </div>
        </section>

        <section className="surface p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-white">
            Eligibility
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              type="number"
              label="Credit score"
              hint="Use 750 if you’re not sure."
              error={formState.errors.creditScore?.message}
              {...register('creditScore')}
            />
            <Input
              type="number"
              label="Age"
              error={formState.errors.age?.message}
              {...register('age')}
            />
          </div>
        </section>

        {formError && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
          >
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Score all cards for me
        </Button>
      </form>
    </div>
  );
}
