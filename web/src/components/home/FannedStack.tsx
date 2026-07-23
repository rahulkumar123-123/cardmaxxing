import { motion } from 'framer-motion';
import { CardFace } from '@/components/cards/CardFace';
import type { Card } from '@/types';

type StackCard = Pick<Card, 'slug' | 'name' | 'issuer' | 'network' | 'imageUrl' | 'tier'>;

const FALLBACK: StackCard[] = [
  {
    slug: 'stack-1',
    name: 'Infinia Metal',
    issuer: 'HDFC Bank',
    network: 'VISA',
    imageUrl: null,
    tier: 'SUPER_PREMIUM',
  },
  {
    slug: 'stack-2',
    name: 'Atlas',
    issuer: 'Axis Bank',
    network: 'VISA',
    imageUrl: null,
    tier: 'PREMIUM',
  },
  {
    slug: 'stack-3',
    name: 'Cashback Card',
    issuer: 'SBI Card',
    network: 'VISA',
    imageUrl: null,
    tier: 'MID',
  },
  {
    slug: 'stack-4',
    name: 'Amazon Pay',
    issuer: 'ICICI Bank',
    network: 'VISA',
    imageUrl: null,
    tier: 'ENTRY',
  },
  {
    slug: 'stack-5',
    name: 'Zenith+',
    issuer: 'AU Bank',
    network: 'MASTERCARD',
    imageUrl: null,
    tier: 'SUPER_PREMIUM',
  },
];

/** The signature hero visual: five card faces fanned out, each settling into place. */
export function FannedStack({ cards }: { cards?: StackCard[] }) {
  const stack = (cards && cards.length >= 5 ? cards : FALLBACK).slice(0, 5);

  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-lg" aria-hidden>
      {stack.map((card, index) => {
        const offset = index - 2;
        return (
          <motion.div
            key={card.slug}
            className="absolute left-1/2 top-1/2 w-[62%]"
            initial={{ opacity: 0, x: '-50%', y: '-30%', rotate: 0, scale: 0.85 }}
            animate={{
              opacity: 1,
              x: `calc(-50% + ${offset * 17}%)`,
              y: `calc(-50% + ${Math.abs(offset) * 7}%)`,
              rotate: offset * 8,
              scale: 1 - Math.abs(offset) * 0.05,
            }}
            transition={{
              duration: 0.8,
              delay: 0.1 + index * 0.09,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={{ y: `calc(-50% + ${Math.abs(offset) * 7 - 8}%)`, scale: 1.03, zIndex: 20 }}
            style={{ zIndex: 10 - Math.abs(offset) }}
          >
            <CardFace card={card} compact />
          </motion.div>
        );
      })}
    </div>
  );
}
