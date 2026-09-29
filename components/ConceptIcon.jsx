'use client';

import {
  LuBookOpen,
  LuBanknote,
  LuBrain,
  LuChartLine,
  LuClock3,
  LuCoins,
  LuDollarSign,
  LuDroplets,
  LuFlaskConical,
  LuLandmark,
  LuLayers,
  LuLightbulb,
  LuPiggyBank,
  LuTarget,
  LuTrendingDown,
  LuTrendingUp,
  LuWallet,
} from 'react-icons/lu';

const icons = {
  book: { component: LuBookOpen, color: 'text-sky-300' },
  banknote: { component: LuBanknote, color: 'text-emerald-300' },
  coins: { component: LuCoins, color: 'text-amber-300' },
  dollar: { component: LuDollarSign, color: 'text-green-300' },
  landmark: { component: LuLandmark, color: 'text-indigo-300' },
  piggybank: { component: LuPiggyBank, color: 'text-pink-300' },
  wallet: { component: LuWallet, color: 'text-teal-300' },
  growth: { component: LuTrendingUp, color: 'text-lime-300' },
  risk: { component: LuTrendingDown, color: 'text-red-300' },
  chart: { component: LuChartLine, color: 'text-emerald-300' },
  water: { component: LuDroplets, color: 'text-cyan-300' },
  layers: { component: LuLayers, color: 'text-violet-300' },
  target: { component: LuTarget, color: 'text-rose-300' },
  brain: { component: LuBrain, color: 'text-fuchsia-300' },
  lightbulb: { component: LuLightbulb, color: 'text-amber-300' },
  clock: { component: LuClock3, color: 'text-orange-300' },
  flask: { component: LuFlaskConical, color: 'text-lime-300' },
};

export const conceptIconOptions = Object.entries(icons).map(([value, entry]) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1),
}));

export default function ConceptIcon({ icon = 'book', className = 'h-4 w-4' }) {
  const entry = icons[icon];
  if (!entry) return <span className={className} aria-hidden>{icon || '📖'}</span>;
  const Icon = entry.component;
  return <Icon className={`${className} ${entry.color}`} aria-hidden />;
}
