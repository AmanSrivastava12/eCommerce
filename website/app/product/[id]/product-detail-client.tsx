'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api-client/resources';
import { useCart } from '@/lib/hooks/use-cart';
import { useWishlist } from '@/lib/hooks/use-wishlist';
import { SpecTable } from '@/components/product/spec-table';
import { FaqAccordion } from '@/components/product/faq-accordion';
import { PincodeCheck } from '@/components/product/pincode-check';
import { FulfillmentFeatures } from '@/components/product/fulfillment-features';
import { ReviewSection } from '@/components/reviews/review-section';

export function ProductDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getById(id),
  });
  const { addItem } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [activeImage, setActiveImage] = useState<string | null>(null);

  if (isLoading || !data) {
    return (
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="aspect-square skeleton rounded-lg" />
        <div className="space-y-3">
          <div className="h-6 w-3/4 skeleton rounded" />
          <div className="h-4 w-1/2 skeleton rounded" />
          <div className="h-8 w-1/3 skeleton rounded" />
        </div>
      </div>
    );
  }

  const { product, price } = data;
  const variant = product.variants.find((v) => v.sku === selectedSku) ?? product.variants[0];
  const sku = variant?.sku ?? '';
  const gallery = variant?.images.length ? variant.images : [product.images.main, ...product.images.gallery];
  const mainImage = activeImage ?? gallery[0] ?? product.images.main;
  const wishlisted = isWishlisted(sku);

  const handleBuyNow = async () => {
    await addItem.mutateAsync({ productId: product._id, sku, quantity: 1 });
    router.push('/cart');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="space-y-8"
    >
      <nav className="text-xs text-[var(--muted)]">
        <Link href="/" className="hover:underline">Home</Link> <span className="mx-1">/</span>{' '}
        <span className="text-[var(--foreground)]">{product.title}</span>
      </nav>

      <div className="grid gap-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 lg:grid-cols-2 lg:p-8">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-lg bg-[var(--background)]">
            <Image
              src={mainImage}
              alt={product.title}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              className="object-cover"
            />
            <button
              onClick={() => toggle(product._id, sku)}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface)]/90 backdrop-blur transition hover:scale-110"
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-5 w-5 ${wishlisted ? 'fill-[var(--danger)] stroke-[var(--danger)]' : 'fill-none stroke-[var(--muted)]'}`}
                strokeWidth={2}
              >
                <path d="M12 21s-6.7-4.35-9.33-8.2C.86 10.1 1.4 6.5 4.3 5.05c2.3-1.15 4.9-.3 6.2 1.7l1.5 2.3 1.5-2.3c1.3-2 3.9-2.85 6.2-1.7 2.9 1.45 3.44 5.05 1.63 7.75C18.7 16.65 12 21 12 21z" />
              </svg>
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {gallery.map((src) => (
              <button
                key={src}
                onClick={() => setActiveImage(src)}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition ${
                  mainImage === src ? 'border-[var(--brand)]' : 'border-[var(--border)]'
                }`}
              >
                <Image src={src} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-medium text-[var(--foreground)]">{product.title}</h1>
            {product.ratingSummary.count > 0 && (
              <div className="mt-1.5 flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-sm border border-[var(--border)] px-1.5 py-0.5 text-xs font-medium text-[var(--brand)]">
                  {product.ratingSummary.average.toFixed(1)} ★
                </span>
                <span className="text-sm text-[var(--muted)]">{product.ratingSummary.count} ratings</span>
                {product.fulfillment.isAssured && (
                  <span className="text-sm font-medium text-[var(--brand)]">Assured</span>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold text-[var(--foreground)]">
                ${price.effectivePrice.toFixed(0)}
              </span>
              {price.strikethroughPrice && (
                <span className="text-[var(--muted)] line-through">${price.strikethroughPrice.toFixed(0)}</span>
              )}
              {price.strikethroughPrice && (
                <span className="text-sm font-medium text-[var(--discount)]">
                  {Math.round((1 - price.effectivePrice / price.strikethroughPrice) * 100)}% off
                </span>
              )}
            </div>
            {price.onSale && <p className="mt-1 text-sm font-medium text-[var(--danger)]">Limited-time sale price</p>}
          </div>

          <p className="text-sm text-[var(--muted)]">{product.description.short}</p>

          {product.variants.length > 1 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-[var(--foreground)]">
                {Object.keys(variant?.attributes ?? {})[0] ?? 'Variant'}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.sku}
                    onClick={() => {
                      setSelectedSku(v.sku);
                      setActiveImage(null);
                    }}
                    className={`rounded-md border-2 px-3 py-1.5 text-sm transition ${
                      sku === v.sku
                        ? 'border-[var(--brand)] bg-[var(--cream)] text-[var(--brand)]'
                        : 'border-[var(--border)] hover:border-[var(--brand-light)]'
                    }`}
                  >
                    {(v.attributes ? Object.values(v.attributes).join(' / ') : '') || v.sku}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => addItem.mutate({ productId: product._id, sku, quantity: 1 })}
              disabled={addItem.isPending}
              className="flex-1 rounded-md bg-[var(--brand)] px-5 py-3 text-sm font-medium text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)] disabled:opacity-50"
            >
              {addItem.isPending ? 'Adding…' : 'Add to Cart'}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleBuyNow}
              className="flex-1 rounded-md border-2 border-[var(--brand)] px-5 py-3 text-sm font-medium text-[var(--brand)] transition hover:bg-[var(--cream)]"
            >
              Buy Now
            </motion.button>
          </div>

          <PincodeCheck productId={product._id} />
        </div>
      </div>

      <FulfillmentFeatures fulfillment={product.fulfillment} />

      {product.description.sections.length > 0 && (
        <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          {product.description.sections.map((s) => (
            <div key={s.heading}>
              <h2 className="mb-1 text-lg font-medium text-[var(--foreground)]">{s.heading}</h2>
              <p className="text-sm text-[var(--muted)]">{s.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <SpecTable specifications={product.description.specifications} />
      </div>
      {product.faqs.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <h2 className="mb-3 text-lg font-medium text-[var(--foreground)]">Frequently Asked Questions</h2>
          <FaqAccordion faqs={product.faqs} />
        </div>
      )}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <ReviewSection productId={product._id} sku={sku} />
      </div>
    </motion.div>
  );
}
