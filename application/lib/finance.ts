import type { Settlement, Transaction } from './api-client/types';

// Human labels for where an item's money currently is (see api/src/seller/seller.service.ts).
export const SETTLEMENT_LABEL: Record<Settlement, string> = {
  awaiting_payment: 'Awaiting payment',
  cancelled: 'Cancelled',
  in_transit: 'In process',
  return_window: 'On hold · return window',
  return_requested: 'On hold · return requested',
  refunded: 'Refunded',
  settled: 'Settled',
};

export const SETTLEMENT_TONE: Record<Settlement, 'neutral' | 'success' | 'warning' | 'danger' | 'brand'> = {
  awaiting_payment: 'neutral',
  cancelled: 'danger',
  in_transit: 'warning',
  return_window: 'warning',
  return_requested: 'warning',
  refunded: 'danger',
  settled: 'success',
};

// Validated with the dataviz palette checker against a white surface (all six checks pass).
export const CHART_COLORS = { in: '#b0621c', out: '#0a7fb0' };

export type Granularity = 'day' | 'week' | 'month';

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function bucketStart(d: Date, g: Granularity) {
  const x = startOfDay(d);
  if (g === 'week') x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  if (g === 'month') x.setDate(1);
  return x;
}

function nextBucket(d: Date, g: Granularity) {
  const x = new Date(d);
  if (g === 'day') x.setDate(x.getDate() + 1);
  if (g === 'week') x.setDate(x.getDate() + 7);
  if (g === 'month') x.setMonth(x.getMonth() + 1);
  return x;
}

export function bucketLabel(d: Date, g: Granularity) {
  if (g === 'month') return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Picks a readable bucket size for a date span (keeps charts to roughly ≤ 14 bars). */
export function autoGranularity(from: Date, to: Date): Granularity {
  const days = (to.getTime() - from.getTime()) / 86_400_000;
  if (days <= 14) return 'day';
  if (days <= 98) return 'week';
  return 'month';
}

export interface Bucket {
  start: Date;
  label: string;
  in: number;
  out: number;
  net: number;
  /** Running net across the range, for the balance trend line. */
  cumulative: number;
}

export function bucketize(txns: Transaction[], from: Date, to: Date, g: Granularity): Bucket[] {
  const buckets: Bucket[] = [];
  for (let s = bucketStart(from, g); s <= to; s = nextBucket(s, g)) {
    buckets.push({ start: s, label: bucketLabel(s, g), in: 0, out: 0, net: 0, cumulative: 0 });
  }
  for (const t of txns) {
    const start = bucketStart(new Date(t.date), g).getTime();
    const b = buckets.find((x) => x.start.getTime() === start);
    if (!b) continue;
    if (t.direction === 'in') b.in += t.amount;
    else b.out += t.amount;
  }
  let running = 0;
  for (const b of buckets) {
    b.net = b.in - b.out;
    running += b.net;
    b.cumulative = running;
  }
  return buckets;
}

export function formatCompact(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}
