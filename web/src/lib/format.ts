const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });

export const formatInr = (value: number): string => inr.format(Math.round(value));

/** Indian numbering shorthand: 250000 -> "₹2.5L". */
export function formatInrCompact(value: number): string {
  if (value === 0) return 'Free';
  if (Math.abs(value) >= 10000000)
    return `₹${(value / 10000000).toFixed(value % 10000000 === 0 ? 0 : 1)}Cr`;
  if (Math.abs(value) >= 100000)
    return `₹${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L`;
  if (Math.abs(value) >= 1000) return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`;
  return `₹${compact.format(value)}`;
}

export const formatFee = (value: number): string =>
  value === 0 ? 'Lifetime free' : formatInr(value);

export const formatPercent = (value: number): string =>
  `${Number.isInteger(value) ? value : value.toFixed(2).replace(/0$/, '')}%`;

export const formatDate = (value: string | Date): string =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** ENUM_LIKE_THIS -> "Enum like this". */
export function humanise(value: string): string {
  const lower = value.toLowerCase().replace(/_/g, ' ');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Deterministic gradient per card so every card renders a stable, distinct face. */
const GRADIENTS = [
  'linear-gradient(135deg, #312E81 0%, #4F46E5 55%, #6366F1 100%)',
  'linear-gradient(135deg, #0B1120 0%, #1E293B 60%, #334155 100%)',
  'linear-gradient(135deg, #7A4110 0%, #DC8908 55%, #FEC84B 100%)',
  'linear-gradient(135deg, #1E1B4B 0%, #3730A3 50%, #F5A623 140%)',
  'linear-gradient(135deg, #0F172A 0%, #4338CA 70%, #818CF8 100%)',
  'linear-gradient(135deg, #4338CA 0%, #6366F1 40%, #FDB022 130%)',
];

export function cardGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length]!;
}
