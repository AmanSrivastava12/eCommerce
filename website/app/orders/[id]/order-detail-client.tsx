'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi, productsApi, returnsApi } from '@/lib/api-client/resources';
import { ApiError } from '@/lib/api-client/client';
import { ErrorState } from '@/components/ui/error-state';

const STATUS_STYLES: Record<string, string> = {
  placed: 'border-[var(--border)] text-[var(--muted)]',
  paid: 'border-[var(--brand)] text-[var(--brand)]',
  shipped: 'border-[var(--brand)] text-[var(--brand)]',
  delivered: 'border-[var(--discount)] text-[var(--discount)]',
  cancelled: 'border-[var(--danger)] text-[var(--danger)]',
};

const RETURN_STATUS_STYLES: Record<string, string> = {
  requested: 'border-[var(--border)] text-[var(--muted)]',
  approved: 'border-[var(--brand)] text-[var(--brand)]',
  completed: 'border-[var(--discount)] text-[var(--discount)]',
  rejected: 'border-[var(--danger)] text-[var(--danger)]',
};

const ORDER_STEPS = ['placed', 'paid', 'shipped', 'delivered'] as const;

export function OrderDetailClient({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<Record<string, string>>({});
  const [openReturnFor, setOpenReturnFor] = useState<string | null>(null);
  const [returnError, setReturnError] = useState<Record<string, string>>({});

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id),
  });
  const { data: myReturns } = useQuery({ queryKey: ['my-returns'], queryFn: returnsApi.mine });

  const uniqueProductIds = [...new Set((order?.items ?? []).map((i) => i.product_id))];
  const productQueries = useQueries({
    queries: uniqueProductIds.map((productId) => ({
      queryKey: ['product', productId],
      queryFn: () => productsApi.getById(productId),
    })),
  });
  const productById = new Map(
    uniqueProductIds.map((productId, i) => [productId, productQueries[i]?.data?.product]),
  );

  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', id] }),
  });

  const requestReturn = useMutation({
    mutationFn: (itemId: string) => ordersApi.requestReturn(id, itemId, reason[itemId] ?? ''),
    onSuccess: (_data, itemId) => {
      setOpenReturnFor(null);
      setReason((r) => ({ ...r, [itemId]: '' }));
      setReturnError((r) => ({ ...r, [itemId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['my-returns'] });
    },
    onError: (err, itemId) => {
      const message = err instanceof ApiError ? String((err.body as any)?.message ?? err.message) : 'Could not submit return request';
      setReturnError((r) => ({ ...r, [itemId]: message }));
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <div className="h-6 w-1/3 skeleton rounded" />
        <div className="h-24 skeleton rounded-lg" />
        <div className="h-24 skeleton rounded-lg" />
      </div>
    );
  }

  if (isError || !order) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const canCancel =
    (order.status === 'placed' || order.status === 'paid') &&
    order.cancellable_until &&
    new Date(order.cancellable_until) > new Date();

  const isCancelled = order.status === 'cancelled';
  const currentStepIndex = ORDER_STEPS.indexOf(order.status as (typeof ORDER_STEPS)[number]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-3xl space-y-6"
    >
      <nav className="text-xs text-[var(--muted)]">
        <Link href="/orders" className="hover:underline">Your Orders</Link> <span className="mx-1">/</span>{' '}
        <span className="text-[var(--foreground)]">Order #{order.id.slice(0, 8)}</span>
      </nav>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-medium text-[var(--foreground)]">Order #{order.id.slice(0, 8)}</h1>
            <p className="text-sm text-[var(--muted)]">
              Placed {new Date(order.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-sm font-medium capitalize ${STATUS_STYLES[order.status]}`}>
            {order.status}
          </span>
        </div>

        {!isCancelled && (
          <div className="mt-5 flex items-center">
            {ORDER_STEPS.map((step, i) => (
              <div key={step} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      i <= currentStepIndex
                        ? 'bg-[var(--brand)] text-[var(--brand-foreground)]'
                        : 'border border-[var(--border)] text-[var(--muted)]'
                    }`}
                  >
                    {i <= currentStepIndex ? '✓' : i + 1}
                  </div>
                  <span className="text-[11px] capitalize text-[var(--muted)]">{step}</span>
                </div>
                {i < ORDER_STEPS.length - 1 && (
                  <div
                    className={`mx-1 h-[2px] flex-1 ${i < currentStepIndex ? 'bg-[var(--brand)]' : 'bg-[var(--border)]'}`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {canCancel && (
          <button
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
            className="mt-4 text-sm font-medium text-[var(--danger)] hover:underline disabled:opacity-50"
          >
            {cancel.isPending ? 'Cancelling…' : 'Cancel order'}
          </button>
        )}
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Shipping Address
        </h2>
        <p className="font-medium text-[var(--foreground)]">{order.shipping_address.label ?? 'Delivery address'}</p>
        <p className="text-sm text-[var(--muted)]">
          {order.shipping_address.line1}
          {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''}
          {order.shipping_address.city ? `, ${order.shipping_address.city}` : ''}
          {order.shipping_address.state ? `, ${order.shipping_address.state}` : ''}
          {order.shipping_address.postalCode ? ` ${order.shipping_address.postalCode}` : ''}
          {order.shipping_address.country ? `, ${order.shipping_address.country}` : ''}
        </p>
        <p className="text-sm text-[var(--muted)]">📞 {order.shipping_phone}</p>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Items ({order.items.length})
        </h2>
        <div className="space-y-3">
          {order.items.map((item) => {
            const product = productById.get(item.product_id);
            const variant = product?.variants.find((v) => v.sku === item.sku);
            const image = variant?.images[0] ?? product?.images.main;
            const activeReturn = myReturns?.find((r) => r.order_item_id === item.id);

            return (
              <div
                key={item.id}
                className="flex gap-3 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0"
              >
                <Link
                  href={product ? `/product/${product._id}` : '#'}
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-[var(--background)]"
                >
                  {image ? (
                    <Image src={image} alt={product?.title ?? item.sku} fill sizes="80px" className="object-cover" />
                  ) : (
                    <div className="skeleton h-full w-full" />
                  )}
                </Link>
                <div className="flex-1">
                  <Link
                    href={product ? `/product/${product._id}` : '#'}
                    className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--brand)] hover:underline"
                  >
                    {product?.title ?? item.sku}
                  </Link>
                  {variant?.attributes && Object.keys(variant.attributes).length > 0 && (
                    <p className="text-xs text-[var(--muted)]">{Object.values(variant.attributes).join(' / ')}</p>
                  )}
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Qty {item.quantity} × ${item.unit_price.toFixed(2)} = ${item.subtotal.toFixed(2)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium capitalize text-[var(--muted)]">
                      {item.fulfillment_status}
                    </span>
                    {activeReturn && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${RETURN_STATUS_STYLES[activeReturn.status]}`}
                      >
                        Return {activeReturn.status}
                      </span>
                    )}
                  </div>

                  {item.fulfillment_status === 'delivered' && !activeReturn && (
                    <div className="mt-2">
                      {openReturnFor === item.id ? (
                        <div>
                          <div className="flex gap-2">
                            <input
                              autoFocus
                              placeholder="Reason for return"
                              value={reason[item.id] ?? ''}
                              onChange={(e) => setReason({ ...reason, [item.id]: e.target.value })}
                              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs outline-none focus:border-[var(--brand)]"
                            />
                            <button
                              onClick={() => requestReturn.mutate(item.id)}
                              disabled={requestReturn.isPending || !reason[item.id]}
                              className="rounded-md bg-[var(--brand)] px-3 py-1 text-xs text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)] disabled:opacity-50"
                            >
                              {requestReturn.isPending ? 'Submitting…' : 'Submit'}
                            </button>
                          </div>
                          {returnError[item.id] && (
                            <p className="mt-1 text-xs text-[var(--danger)]">{returnError[item.id]}</p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setOpenReturnFor(item.id)}
                          className="text-xs font-medium text-[var(--brand)] hover:underline"
                        >
                          Request return
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Price Details
        </h2>
        <div className="space-y-1.5 text-sm text-[var(--foreground)]">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Subtotal</span>
            <span>
              {order.currency} {order.subtotal.toFixed(2)}
            </span>
          </div>
          {order.discount_total > 0 && (
            <div className="flex justify-between text-[var(--discount)]">
              <span>
                Discount{order.coupon_codes.length > 0 ? ` (${order.coupon_codes.join(', ')})` : ''}
              </span>
              <span>
                -{order.currency} {order.discount_total.toFixed(2)}
              </span>
            </div>
          )}
          {order.tax > 0 && (
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Tax</span>
              <span>
                {order.currency} {order.tax.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Delivery Charges</span>
            <span>
              {order.shipping_fee > 0 ? `${order.currency} ${order.shipping_fee.toFixed(2)}` : 'FREE'}
            </span>
          </div>
          <div className="flex justify-between border-t border-[var(--border)] pt-1.5 text-base font-semibold">
            <span>Total</span>
            <span>
              {order.currency} {order.total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
