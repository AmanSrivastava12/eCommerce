'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Product } from '@/lib/api-client/types';
import { useCart } from '@/lib/hooks/use-cart';
import { useWishlist } from '@/lib/hooks/use-wishlist';

function effectivePriceOf(product: Product) {
  if (product.pricing.discountPercent) {
    return product.pricing.basePrice * (1 - product.pricing.discountPercent / 100);
  }
  if (product.pricing.discountAmount) {
    return Math.max(0, product.pricing.basePrice - product.pricing.discountAmount);
  }
  return product.pricing.basePrice;
}

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { addItem } = useCart();
  const { isWishlisted, toggle } = useWishlist();

  const price = effectivePriceOf(product);
  const discountPercent =
    product.pricing.discountPercent ??
    (product.pricing.discountAmount
      ? Math.round((product.pricing.discountAmount / product.pricing.basePrice) * 100)
      : 0);
  const discounted = price !== product.pricing.basePrice;
  const defaultSku = product.variants[0]?.sku ?? '';
  const wishlisted = isWishlisted(defaultSku);

  return (
    <motion.div
      layout
      whileHover={{ y: -6, boxShadow: '0 16px 28px -14px rgba(58, 43, 30, 0.3)' }}
      transition={{ duration: 0.2 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--brand-light)]"
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          toggle(product._id, defaultSku);
        }}
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)]/90 backdrop-blur transition hover:scale-110"
      >
        <motion.svg
          initial={false}
          animate={wishlisted ? { scale: [1, 1.3, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
          viewBox="0 0 24 24"
          className={`h-[18px] w-[18px] transition-colors ${
            wishlisted ? 'fill-[var(--danger)] stroke-[var(--danger)]' : 'fill-none stroke-[var(--muted)]'
          }`}
          strokeWidth={2}
        >
          <path d="M12 21s-6.7-4.35-9.33-8.2C.86 10.1 1.4 6.5 4.3 5.05c2.3-1.15 4.9-.3 6.2 1.7l1.5 2.3 1.5-2.3c1.3-2 3.9-2.85 6.2-1.7 2.9 1.45 3.44 5.05 1.63 7.75C18.7 16.65 12 21 12 21z" />
        </motion.svg>
      </button>

      {discounted && discountPercent > 0 && (
        <span className="absolute left-2 top-2 z-10 rounded-sm bg-[var(--danger)] px-1.5 py-0.5 text-[11px] font-medium text-white">
          {discountPercent}% OFF
        </span>
      )}

      <Link href={`/product/${product._id}`} className="flex flex-1 flex-col">
        <div className="relative aspect-square w-full overflow-hidden bg-[var(--background)]">
          <Image
            src={product.images.main}
            alt={product.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
            priority={priority}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <p className="line-clamp-2 min-h-[2.5rem] text-sm text-[var(--foreground)]">{product.title}</p>

          {product.ratingSummary.count > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-0.5 rounded-sm border border-[var(--border)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--brand)]">
                {product.ratingSummary.average.toFixed(1)} ★
              </span>
              <span className="text-xs text-[var(--muted)]">({product.ratingSummary.count})</span>
              {product.fulfillment.isAssured && (
                <span className="text-xs font-medium text-[var(--brand)]">Assured</span>
              )}
            </div>
          )}

          <div className="mt-auto flex items-baseline gap-2 pt-1">
            <span className="text-base font-semibold text-[var(--foreground)]">${price.toFixed(0)}</span>
            {discounted && (
              <span className="text-xs text-[var(--muted)] line-through">
                ${product.pricing.basePrice.toFixed(0)}
              </span>
            )}
            {discounted && discountPercent > 0 && (
              <span className="text-xs font-medium text-[var(--discount)]">{discountPercent}% off</span>
            )}
          </div>
          {defaultSku && (
            <p className="text-[11px] text-[var(--muted)]">
              Delivery in {product.fulfillment.estimatedDeliveryDays} days ·{' '}
              {product.fulfillment.shippingFee
                ? `$${product.fulfillment.shippingFee.toFixed(0)} shipping`
                : 'Free shipping'}
            </p>
          )}
        </div>
      </Link>

      <div className="border-t border-[var(--border)] p-2">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => addItem.mutate({ productId: product._id, sku: defaultSku, quantity: 1 })}
          disabled={addItem.isPending || !defaultSku}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-medium text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)] disabled:opacity-50"
        >
          {addItem.isPending ? 'Adding…' : 'Add to Cart'}
        </motion.button>
      </div>
    </motion.div>
  );
}
