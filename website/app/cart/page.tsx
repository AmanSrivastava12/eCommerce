'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueries } from '@tanstack/react-query';
import { useCart } from '@/lib/hooks/use-cart';
import { useWishlist } from '@/lib/hooks/use-wishlist';
import { productsApi } from '@/lib/api-client/resources';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-[18px] w-[18px] transition-colors ${
        filled ? 'fill-[var(--danger)] stroke-[var(--danger)]' : 'fill-none stroke-current'
      }`}
      strokeWidth={2}
    >
      <path d="M12 21s-6.7-4.35-9.33-8.2C.86 10.1 1.4 6.5 4.3 5.05c2.3-1.15 4.9-.3 6.2 1.7l1.5 2.3 1.5-2.3c1.3-2 3.9-2.85 6.2-1.7 2.9 1.45 3.44 5.05 1.63 7.75C18.7 16.65 12 21 12 21z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-none stroke-current" strokeWidth={2}>
      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
    </svg>
  );
}

const CONTROL_BUTTON =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] transition disabled:cursor-not-allowed disabled:opacity-30';

export default function CartPage() {
  const {
    data: cart,
    isLoading,
    isError,
    refetch,
    updateItem,
    removeItem,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  const items = cart?.items ?? [];
  const productQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ['product', item.productId],
      queryFn: () => productsApi.getById(item.productId),
      enabled: items.length > 0,
    })),
  });
  const productLoading = productQueries.some((q) => q.isLoading);

  if (isLoading) return <p className="text-sm text-[var(--muted)]">Loading cart…</p>;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const subtotal = items.reduce((sum, i) => sum + i.priceAtAdd * i.quantity, 0);
  const discountTotal = cart?.appliedCoupons.reduce((sum, c) => sum + c.discountApplied, 0) ?? 0;
  // Mirrors the API's order total: each distinct product's shipping fee is charged once.
  const shippingByProduct = new Map<string, number>();
  productQueries.forEach((q) => {
    const product = q.data?.product;
    if (product) shippingByProduct.set(product._id, product.fulfillment.shippingFee ?? 0);
  });
  const shippingFee = [...shippingByProduct.values()].reduce((sum, fee) => sum + fee, 0);
  const total = subtotal - discountTotal + shippingFee;

  if (items.length === 0) {
    return (
      <EmptyState
        icon="box"
        title="Your cart is empty"
        subtitle="Items you add to your cart will appear here."
        actionLabel="Continue shopping"
        actionHref="/search"
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <h1 className="text-xl font-medium text-[var(--foreground)]">Your Cart</h1>
        <AnimatePresence initial={false}>
          {items.map((item, i) => {
            const result = productQueries[i]?.data;
            const product = result?.product;
            const variant = product?.variants.find((v) => v.sku === item.sku);
            const image = variant?.images?.[0] ?? product?.images.main;
            const wishlisted = isWishlisted(item.sku);
            const lineTotal = item.priceAtAdd * item.quantity;
            const availableQty = variant?.availableQty ?? null;
            const isPendingThisItem = updateItem.isPending && updateItem.variables?.sku === item.sku;
            const atMax = availableQty != null && item.quantity >= availableQty;
            const atMin = item.quantity <= 1;

            return (
              <motion.div
                key={item.sku}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="flex flex-wrap items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <Link
                  href={product ? `/product/${product._id}` : '#'}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-[var(--background)]"
                >
                  {productLoading && !product ? (
                    <div className="skeleton h-full w-full" />
                  ) : image ? (
                    <Image src={image} alt={product?.title ?? item.sku} fill sizes="64px" className="object-cover" />
                  ) : null}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={product ? `/product/${product._id}` : '#'}
                    className="line-clamp-1 text-sm font-medium text-[var(--foreground)] hover:text-[var(--brand)] hover:underline"
                  >
                    {product?.title ?? item.sku}
                  </Link>
                  {variant?.attributes && Object.keys(variant.attributes).length > 0 && (
                    <p className="text-xs text-[var(--muted)]">{Object.values(variant.attributes).join(' / ')}</p>
                  )}
                  <p className="mt-0.5 text-xs text-[var(--muted)]">${item.priceAtAdd.toFixed(2)} each</p>
                  <p className="text-sm font-medium text-[var(--foreground)]">${lineTotal.toFixed(2)}</p>
                  {availableQty != null && availableQty <= 5 && (
                    <p className="mt-0.5 text-xs font-medium text-[var(--danger)]">
                      Only {availableQty} left in stock
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    title="Decrease quantity"
                    aria-label="Decrease quantity"
                    onClick={() => updateItem.mutate({ sku: item.sku, quantity: item.quantity - 1 })}
                    disabled={atMin || isPendingThisItem}
                    className={`${CONTROL_BUTTON} text-[var(--brand)] hover:bg-[var(--cream)]`}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium text-[var(--foreground)]">
                    {item.quantity}
                  </span>
                  <button
                    title={atMax ? 'No more stock available' : 'Increase quantity'}
                    aria-label={atMax ? 'No more stock available' : 'Increase quantity'}
                    onClick={() => updateItem.mutate({ sku: item.sku, quantity: item.quantity + 1 })}
                    disabled={atMax || isPendingThisItem}
                    className={`${CONTROL_BUTTON} text-[var(--brand)] hover:bg-[var(--cream)]`}
                  >
                    +
                  </button>

                  <button
                    title={wishlisted ? 'Already in wishlist' : 'Add to wishlist'}
                    aria-label={wishlisted ? 'Already in wishlist' : 'Add to wishlist'}
                    onClick={() => !wishlisted && product && toggleWishlist(product._id, item.sku)}
                    disabled={!product}
                    className={`${CONTROL_BUTTON} text-[var(--muted)] hover:border-[var(--danger)] hover:text-[var(--danger)]`}
                  >
                    <HeartIcon filled={wishlisted} />
                  </button>

                  <button
                    title="Remove from cart"
                    aria-label="Remove from cart"
                    onClick={() => removeItem.mutate(item.sku)}
                    className={`${CONTROL_BUTTON} text-[var(--danger)] hover:bg-[var(--cream)]`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="font-medium text-[var(--foreground)]">Order Summary</h2>
        <div className="flex gap-2">
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Coupon code"
            title="Coupon code"
            className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
          />
          <motion.button
            whileTap={{ scale: 0.96 }}
            title="Apply coupon"
            onClick={() =>
              applyCoupon.mutate(couponCode, {
                onError: (err: any) => setCouponError(err?.body?.message ?? 'Invalid coupon'),
                onSuccess: () => setCouponError(null),
              })
            }
            className="rounded-md bg-[var(--brand)] px-3 py-1 text-sm text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)]"
          >
            Apply
          </motion.button>
        </div>
        {couponError && <p className="text-sm text-[var(--danger)]">{couponError}</p>}
        {cart?.appliedCoupons.map((c) => (
          <div key={c.code} className="flex justify-between text-sm text-[var(--foreground)]">
            <span>{c.code}</span>
            <button
              title="Remove coupon"
              onClick={() => removeCoupon.mutate(c.code)}
              className="text-[var(--danger)] hover:underline"
            >
              remove
            </button>
          </div>
        ))}
        <div className="space-y-1 border-t border-[var(--border)] pt-3 text-sm text-[var(--foreground)]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {discountTotal > 0 && (
            <div className="flex justify-between text-[var(--discount)]">
              <span>Discount</span>
              <span>-${discountTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{shippingFee > 0 ? `$${shippingFee.toFixed(2)}` : 'Free'}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
        <motion.div whileTap={{ scale: 0.98 }}>
          <Link
            href="/checkout"
            title="Proceed to checkout"
            className="block rounded-md bg-[var(--brand)] px-4 py-2 text-center text-sm font-medium text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)]"
          >
            Checkout
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
