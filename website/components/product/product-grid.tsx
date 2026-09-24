'use client';

import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { productsApi, ProductBrowseQuery } from '@/lib/api-client/resources';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ProductCard } from './product-card';

export function ProductGrid({
  query,
  enablePriority = false,
}: {
  query: ProductBrowseQuery;
  /** Set when this grid's first row renders above the fold, so its likely LCP image is eager-loaded. */
  enablePriority?: boolean;
}) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', query],
    queryFn: () => productsApi.browse(query),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square skeleton rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState title="Couldn't load products" onRetry={() => refetch()} />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon="search"
        title="No products found"
        subtitle="Try adjusting your filters or search terms."
      />
    );
  }

  return (
    <motion.div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.04 } },
      }}
    >
      {data.map((product, i) => (
        <motion.div
          key={product._id}
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          {/* The grid is 2 cols on mobile up to 4 on desktop, so the "first row" above the
              fold can be anywhere from 2 to 8 items depending on viewport — eager-load
              through index 8 rather than guessing a single breakpoint's row size. */}
          <ProductCard product={product} priority={enablePriority && i < 8} />
        </motion.div>
      ))}
    </motion.div>
  );
}
