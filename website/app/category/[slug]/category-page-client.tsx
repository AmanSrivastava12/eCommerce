'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '@/lib/api-client/resources';
import { Category } from '@/lib/api-client/types';
import { FilterSidebar } from '@/components/filters/filter-sidebar';
import { SortTabs } from '@/components/filters/sort-tabs';
import { ProductGrid } from '@/components/product/product-grid';

export function CategoryPageClient({ slug, initialCategories }: { slug: string; initialCategories?: Category[] }) {
  const searchParams = useSearchParams();
  // `initialData` comes from the server-rendered page itself, so the first client render
  // has the exact same data the SSR pass used — no client-only fetch to race against it.
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    initialData: initialCategories,
  });
  const category = categories?.find((c) => c.slug === slug);
  const parent = category?.parentId ? categories?.find((c) => c._id === category.parentId) : undefined;
  const subcategories = category ? categories?.filter((c) => c.parentId === category._id) ?? [] : [];

  const query = {
    category: category?._id,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    minRating: searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined,
    inStock: searchParams.get('inStock') === 'true',
    sort: searchParams.get('sort') ?? undefined,
  };

  return (
    <div>
      <nav className="mb-3 text-xs text-[var(--muted)]">
        <span>Home</span> <span className="mx-1">/</span>{' '}
        {parent && (
          <>
            <Link href={`/category/${parent.slug}`} className="hover:underline">
              {parent.name}
            </Link>{' '}
            <span className="mx-1">/</span>{' '}
          </>
        )}
        <span className="font-medium text-[var(--foreground)]">{category?.name ?? '…'}</span>
      </nav>
      <h1 className="mb-2 text-xl font-medium text-[var(--foreground)]">{category?.name ?? 'Category'}</h1>

      {subcategories.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {subcategories.map((sub) => (
            <Link
              key={sub._id}
              href={`/category/${sub.slug}`}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--foreground)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <FilterSidebar showCategories />
        <div className="flex-1">
          <SortTabs />
          {category ? (
            <ProductGrid query={query} enablePriority />
          ) : categories ? (
            <p className="text-sm text-[var(--muted)]">Category not found.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square skeleton rounded-lg" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
