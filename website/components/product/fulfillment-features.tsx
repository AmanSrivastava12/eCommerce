import { Product } from '@/lib/api-client/types';

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-[var(--brand)]" strokeWidth={1.75}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-[var(--brand)]" strokeWidth={1.75}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

function ExchangeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-[var(--brand)]" strokeWidth={1.75}>
      <path d="M7 7h11l-3-3" />
      <path d="M17 17H6l3 3" />
    </svg>
  );
}

function ReplacementIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-[var(--brand)]" strokeWidth={1.75}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  );
}

function FeatureTile({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-[var(--border)] p-4 text-center">
      {icon}
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      <p className="text-xs text-[var(--muted)]">{subtitle}</p>
    </div>
  );
}

export function FulfillmentFeatures({ fulfillment }: { fulfillment: Product['fulfillment'] }) {
  const tiles = [
    fulfillment.warranty && {
      icon: <ShieldIcon />,
      title: 'Warranty',
      subtitle: fulfillment.warranty,
    },
    fulfillment.returnWindowDays && {
      icon: <ReturnIcon />,
      title: 'Easy Returns',
      subtitle: `${fulfillment.returnWindowDays}-day return window`,
    },
    fulfillment.returnWindowDays && {
      icon: <ExchangeIcon />,
      title: 'Easy Exchange',
      subtitle: `Exchange within ${fulfillment.returnWindowDays} days`,
    },
    {
      icon: <ReplacementIcon />,
      title: 'Free Replacement',
      subtitle: fulfillment.replacementWindowDays
        ? `Replacement within ${fulfillment.replacementWindowDays} days`
        : 'If delivered damaged, defective, or wrong item',
    },
  ].filter(Boolean) as { icon: React.ReactNode; title: string; subtitle: string }[];

  if (tiles.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:grid-cols-4 sm:p-6">
      {tiles.map((tile) => (
        <FeatureTile key={tile.title} {...tile} />
      ))}
    </div>
  );
}
