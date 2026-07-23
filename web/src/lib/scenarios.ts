import { Briefcase, Fuel, GraduationCap, Plane, ShoppingBag, UtensilsCrossed } from 'lucide-react';

export interface Scenario {
  id: string;
  label: string;
  icon: typeof Plane;
  /** Tag filter applied to the catalogue when this chip is selected. */
  tags: string[];
}

export const SCENARIOS: Scenario[] = [
  { id: 'travel', label: 'I fly often', icon: Plane, tags: ['travel', 'lounge'] },
  {
    id: 'shopping',
    label: 'I shop online',
    icon: ShoppingBag,
    tags: ['online-shopping', 'cashback'],
  },
  { id: 'fuel', label: 'I drive daily', icon: Fuel, tags: ['fuel', 'commuter'] },
  {
    id: 'dining',
    label: 'I eat out a lot',
    icon: UtensilsCrossed,
    tags: ['dining', 'food-delivery'],
  },
  {
    id: 'first',
    label: 'It’s my first card',
    icon: GraduationCap,
    tags: ['first-card', 'lifetime-free'],
  },
  {
    id: 'premium',
    label: 'I want premium perks',
    icon: Briefcase,
    tags: ['super-premium', 'premium'],
  },
];
