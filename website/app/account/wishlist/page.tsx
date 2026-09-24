'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi, wishlistApi } from '@/lib/api-client/resources';
import { useCart } from '@/lib/hooks/use-cart';
import { useToastStore } from '@/lib/stores/toast-store';
import { useConfirm } from '@/lib/stores/confirm-store';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

const DEFAULT_COLLECTION = 'My Wishlist';

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-none stroke-current" strokeWidth={2}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
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

export default function WishlistPage() {
  const { data, isError, refetch } = useQuery({ queryKey: ['wishlist'], queryFn: wishlistApi.get });
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const push = useToastStore((s) => s.push);
  const confirmDialog = useConfirm();

  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [moveMenuFor, setMoveMenuFor] = useState<string | null>(null);
  // Collections created locally but with no item moved into them yet — the backend only
  // knows about a collection once an item references it, so these live client-side until
  // then (or until the tab is switched away and abandoned).
  const [extraCollections, setExtraCollections] = useState<string[]>([]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['wishlist'] });

  const remove = useMutation({
    mutationFn: (sku: string) => wishlistApi.remove(sku),
    onSuccess: invalidate,
  });

  const moveToCollection = useMutation({
    mutationFn: (vars: { sku: string; collectionName: string }) =>
      wishlistApi.moveToCollection(vars.sku, vars.collectionName),
    onSuccess: (_data, vars) => {
      invalidate();
      setMoveMenuFor(null);
      setActiveCollection(vars.collectionName);
    },
  });

  const deleteCollection = useMutation({
    mutationFn: (name: string) => wishlistApi.deleteCollection(name),
    onSuccess: (_data, name) => {
      invalidate();
      setExtraCollections((c) => c.filter((n) => n !== name));
      setActiveCollection(null);
      push('Collection deleted', 'info');
    },
  });

  const deleteEmptyCollection = (name: string) => {
    setExtraCollections((c) => c.filter((n) => n !== name));
    setActiveCollection(null);
  };

  const items = data?.items ?? [];
  const productQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ['product', item.productId],
      queryFn: () => productsApi.getById(item.productId),
      enabled: items.length > 0,
    })),
  });

  // `data === undefined` alone would stay true forever after a failed request (data never
  // resolves), permanently showing skeletons instead of the error state — `isError` breaks
  // that loop.
  const isLoading = (data === undefined && !isError) || productQueries.some((q) => q.isLoading);

  const collectionNames = [
    ...new Set([...items.map((i) => i.collectionName || DEFAULT_COLLECTION), ...extraCollections]),
  ];
  if (collectionNames.length === 0) collectionNames.push(DEFAULT_COLLECTION);
  const currentCollection = activeCollection && collectionNames.includes(activeCollection)
    ? activeCollection
    : collectionNames[0];

  const visibleItems = items
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => (item.collectionName || DEFAULT_COLLECTION) === currentCollection);

  const createCollection = () => {
    const name = newCollectionName.trim();
    if (!name || collectionNames.includes(name)) return;
    setExtraCollections((c) => [...c, name]);
    setActiveCollection(name);
    setNewCollectionName('');
    setNewCollectionOpen(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-medium text-[var(--foreground)]">
          Wishlist {items.length > 0 && <span className="text-sm font-normal text-[var(--muted)]">({items.length})</span>}
        </h1>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
          {collectionNames.map((name) => (
            <button
              key={name}
              title={`Show "${name}" collection`}
              onClick={() => setActiveCollection(name)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                currentCollection === name
                  ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)]'
                  : 'border-[var(--border)] text-[var(--foreground)] hover:border-[var(--brand-light)]'
              }`}
            >
              {name}
              <span className="ml-1.5 text-xs opacity-70">
                ({items.filter((i) => (i.collectionName || DEFAULT_COLLECTION) === name).length})
              </span>
            </button>
          ))}

          {newCollectionOpen ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createCollection()}
                placeholder="Collection name"
                className="w-36 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm outline-none focus:border-[var(--brand)]"
              />
              <button
                title="Create collection"
                onClick={createCollection}
                className="rounded-md bg-[var(--brand)] px-2.5 py-1.5 text-xs font-medium text-[var(--brand-foreground)]"
              >
                Add
              </button>
              <button
                title="Cancel"
                onClick={() => {
                  setNewCollectionOpen(false);
                  setNewCollectionName('');
                }}
                className="text-xs text-[var(--muted)] hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              title="Create a new collection"
              onClick={() => setNewCollectionOpen(true)}
              className="rounded-full border border-dashed border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              + New collection
            </button>
          )}

          {currentCollection !== DEFAULT_COLLECTION && (
            <button
              title={`Delete "${currentCollection}" collection`}
              onClick={async () => {
                const hasItems = visibleItems.length > 0;
                if (!hasItems) {
                  deleteEmptyCollection(currentCollection);
                  return;
                }
                const confirmed = await confirmDialog({
                  title: `Delete "${currentCollection}"?`,
                  message: 'Items in this collection will also be removed from your wishlist.',
                  confirmLabel: 'Delete',
                  danger: true,
                });
                if (confirmed) deleteCollection.mutate(currentCollection);
              }}
              className="ml-auto text-xs text-[var(--danger)] hover:underline"
            >
              Delete collection
            </button>
          )}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] skeleton rounded-lg" />
          ))}
        </div>
      )}

      {isError && !isLoading && <ErrorState onRetry={() => refetch()} />}

      {!isError && !isLoading && items.length === 0 && (
        <EmptyState
          icon="wishlist"
          title="Your wishlist is empty"
          subtitle="Save items you like by tapping the heart icon on any product."
          actionLabel="Browse products"
          actionHref="/search"
        />
      )}

      {!isError && !isLoading && items.length > 0 && visibleItems.length === 0 && (
        <p className="py-10 text-center text-sm text-[var(--muted)]">
          No items in &quot;{currentCollection}&quot; yet — use Move on any item to add it here.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <AnimatePresence initial={false}>
          {visibleItems.map(({ item, i }) => {
            const result = productQueries[i]?.data;
            if (!result) return null;
            const { product, price } = result;
            return (
              <motion.div
                key={item.sku}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="relative flex flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"
              >
                <Link href={`/product/${product._id}`} className="relative aspect-square bg-[var(--background)]">
                  <Image
                    src={product.images.main}
                    alt={product.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                  />
                </Link>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <Link href={`/product/${product._id}`} className="line-clamp-2 text-sm text-[var(--foreground)] hover:text-[var(--brand)]">
                    {product.title}
                  </Link>
                  <p className="text-sm font-semibold text-[var(--foreground)]">${price.effectivePrice.toFixed(0)}</p>
                  <div className="mt-auto flex items-center gap-2 pt-2">
                    <button
                      title="Add to Cart"
                      aria-label="Add to Cart"
                      onClick={() => addItem.mutate({ productId: product._id, sku: item.sku, quantity: 1 })}
                      className="flex h-8 flex-1 items-center justify-center rounded-md bg-[var(--brand)] text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)]"
                    >
                      <CartIcon />
                    </button>

                    {collectionNames.length > 1 && (
                      <div className="relative">
                        <button
                          title="Move to"
                          aria-label="Move to"
                          onClick={() => setMoveMenuFor(moveMenuFor === item.sku ? null : item.sku)}
                          className="flex h-8 items-center justify-center rounded-md border border-[var(--border)] px-2.5 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--cream)]"
                        >
                          Move to
                        </button>
                        {moveMenuFor === item.sku && (
                          <div className="absolute bottom-full right-0 z-10 mb-1 w-40 rounded-md border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
                            {collectionNames
                              .filter((name) => name !== (item.collectionName || DEFAULT_COLLECTION))
                              .map((name) => (
                                <button
                                  key={name}
                                  title={`Move to "${name}"`}
                                  onClick={() => moveToCollection.mutate({ sku: item.sku, collectionName: name })}
                                  className="block w-full px-3 py-1.5 text-left text-xs text-[var(--foreground)] hover:bg-[var(--cream)]"
                                >
                                  {name}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      title="Remove from wishlist"
                      aria-label="Remove from wishlist"
                      onClick={() => remove.mutate(item.sku)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-[var(--danger)] transition hover:bg-[var(--cream)]"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
