'use client';

import { useSearchParams } from 'next/navigation';
import { FilterSidebar } from '@/components/filters/filter-sidebar';
import { SortTabs } from '@/components/filters/sort-tabs';
import { ProductGrid } from '@/components/product/product-grid';
import { Category } from '@/lib/api-client/types';

export function SearchPageClient({ initialCategories }: { initialCategories?: Category[] }) {
  const searchParams = useSearchParams();

  const query = {
    search: searchParams.get('q') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    minRating: searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined,
    inStock: searchParams.get('inStock') === 'true',
    sort: searchParams.get('sort') ?? undefined,
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <FilterSidebar showCategories initialCategories={initialCategories} />
      <div className="flex-1">
        <h1 className="mb-3 text-xl font-medium text-[var(--foreground)]">
          {query.search ? `Results for “${query.search}”` : 'Browse products'}
        </h1>
        <SortTabs />
        <ProductGrid query={query} enablePriority />
      </div>
    </div>
  );
}
