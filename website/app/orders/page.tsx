'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api-client/resources';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

const STATUS_OPTIONS = [
  { value: '', label: 'All Orders' },
  { value: 'placed', label: 'Placed' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TIME_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: '30d', label: 'Last 30 days' },
  { value: '6m', label: 'Last 6 months' },
  { value: 'year', label: 'This year' },
  { value: 'older', label: 'Older' },
];

const STATUS_STYLES: Record<string, string> = {
  placed: 'border-[var(--border)] text-[var(--muted)]',
  paid: 'border-[var(--brand)] text-[var(--brand)]',
  shipped: 'border-[var(--brand)] text-[var(--brand)]',
  delivered: 'border-[var(--discount)] text-[var(--discount)]',
  cancelled: 'border-[var(--danger)] text-[var(--danger)]',
};

function timeRangeFor(value: string): { from?: string; to?: string } {
  const now = new Date();
  if (value === '30d') {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from: from.toISOString() };
  }
  if (value === '6m') {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 6);
    return { from: from.toISOString() };
  }
  if (value === 'year') {
    return { from: new Date(now.getFullYear(), 0, 1).toISOString() };
  }
  if (value === 'older') {
    return { to: new Date(now.getFullYear(), 0, 1).toISOString() };
  }
  return {};
}

export default function OrdersPage() {
  const [status, setStatus] = useState('');
  const [time, setTime] = useState('');
  const queryClient = useQueryClient();

  const range = useMemo(() => timeRangeFor(time), [time]);

  const { data: orders, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders', status, time],
    queryFn: () => ordersApi.list({ status: status || undefined, ...range }),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => ordersApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const hasNoOrdersAtAll = orders && orders.length === 0 && !status && !time;
  const hasNoFilteredOrders = orders && orders.length === 0 && (status || time);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="w-full shrink-0 space-y-5 lg:w-56">
        <h1 className="text-xl font-medium text-[var(--foreground)]">Your Orders</h1>

        <div className="border-b border-[var(--border)] pb-4">
          <p className="mb-2 text-sm font-medium text-[var(--foreground)]">Order Status</p>
          <div className="space-y-1.5">
            {STATUS_OPTIONS.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <input
                  type="radio"
                  name="status"
                  checked={status === o.value}
                  onChange={() => setStatus(o.value)}
                  className="accent-[var(--brand)]"
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-[var(--foreground)]">Order Time</p>
          <div className="space-y-1.5">
            {TIME_OPTIONS.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <input
                  type="radio"
                  name="time"
                  checked={time === o.value}
                  onChange={() => setTime(o.value)}
                  className="accent-[var(--brand)]"
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex-1 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-lg" />
          ))}

        {isError && !isLoading && <ErrorState onRetry={() => refetch()} />}

        {!isError && hasNoOrdersAtAll && (
          <EmptyState
            icon="orders"
            title="No orders yet"
            subtitle="When you place an order, it will show up here."
            actionLabel="Start shopping"
            actionHref="/search"
          />
        )}

        {!isError && hasNoFilteredOrders && (
          <EmptyState icon="orders" title="No orders match these filters" subtitle="Try a different status or time range." />
        )}

        {(orders ?? []).map((order, i) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm"
          >
            <div className="flex items-center justify-between">
              <Link href={`/orders/${order.id}`} className="font-medium text-[var(--brand)] hover:underline">
                Order #{order.id.slice(0, 8)}
              </Link>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[order.status]}`}>
                {order.status}
              </span>
            </div>
            <p className="mt-1 text-[var(--muted)]">
              {order.items.length} item{order.items.length === 1 ? '' : 's'} · {order.currency}{' '}
              {order.total.toFixed(2)} · Placed {new Date(order.created_at).toLocaleDateString()}
            </p>
            <div className="mt-2 flex items-center gap-4">
              <Link href={`/orders/${order.id}`} className="text-xs font-medium text-[var(--brand)] hover:underline">
                View details
              </Link>
              {(order.status === 'placed' || order.status === 'paid') &&
                order.cancellable_until &&
                new Date(order.cancellable_until) > new Date() && (
                  <button
                    onClick={() => cancel.mutate(order.id)}
                    className="text-xs font-medium text-[var(--danger)] hover:underline"
                  >
                    Cancel order
                  </button>
                )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
