'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '@/lib/api-client/resources';
import { Category } from '@/lib/api-client/types';
import { FilterSection } from './filter-section';

const RATING_OPTIONS = [4, 3, 2, 1];

const FILTER_KEYS = ['minPrice', 'maxPrice', 'minRating', 'inStock'];

export function FilterSidebar({
  showCategories = false,
  initialCategories,
}: {
  showCategories?: boolean;
  initialCategories?: Category[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // `initialData` comes from the server-rendered page, so the first client render matches
  // the SSR pass exactly instead of racing a client-only fetch that could resolve early.
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    enabled: showCategories,
    initialData: initialCategories,
  });

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((k) => params.delete(k));
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';
  const minRating = searchParams.get('minRating') ?? '';
  const inStock = searchParams.get('inStock') === 'true';

  const activeChips = [
    minPrice && { key: 'minPrice', label: `Min $${minPrice}` },
    maxPrice && { key: 'maxPrice', label: `Max $${maxPrice}` },
    minRating && { key: 'minRating', label: `${minRating}★ & above` },
    inStock && { key: 'inStock', label: 'In stock' },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <aside className="w-full shrink-0 space-y-4 lg:w-56">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]">Filters</h2>
        {activeChips.length > 0 && (
          <button onClick={clearAll} className="text-xs font-medium text-[var(--brand)] hover:underline">
            Clear All
          </button>
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setParam(chip.key, '')}
              className="flex items-center gap-1 rounded-full border border-[var(--brand)] bg-[var(--cream)] px-2.5 py-1 text-xs text-[var(--brand)]"
            >
              {chip.label}
              <span className="text-[var(--brand)]">×</span>
            </button>
          ))}
        </div>
      )}

      {showCategories && categories && categories.length > 0 && (
        <div className="border-b border-[var(--border)] pb-4">
          <p className="mb-2 text-sm font-medium text-[var(--foreground)]">Categories</p>
          <div className="space-y-1.5">
            {categories
              .filter((c) => !c.parentId)
              .map((parent) => (
                <div key={parent._id}>
                  <a
                    href={`/category/${parent.slug}`}
                    className="block text-sm font-medium text-[var(--foreground)] transition hover:text-[var(--brand)]"
                  >
                    {parent.name}
                  </a>
                  <div className="ml-3 mt-1 space-y-1 border-l border-[var(--border)] pl-3">
                    {categories
                      .filter((c) => c.parentId === parent._id)
                      .map((child) => (
                        <a
                          key={child._id}
                          href={`/category/${child.slug}`}
                          className="block text-sm text-[var(--muted)] transition hover:text-[var(--brand)]"
                        >
                          {child.name}
                        </a>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <FilterSection title="Price">
        <div className="flex items-center gap-2 text-sm">
          <input
            type="number"
            placeholder="Min"
            defaultValue={minPrice}
            onBlur={(e) => setParam('minPrice', e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 outline-none focus:border-[var(--brand)]"
          />
          <span className="text-[var(--muted)]">–</span>
          <input
            type="number"
            placeholder="Max"
            defaultValue={maxPrice}
            onBlur={(e) => setParam('maxPrice', e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 outline-none focus:border-[var(--brand)]"
          />
        </div>
      </FilterSection>

      <FilterSection title="Customer Ratings">
        {RATING_OPTIONS.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="radio"
              name="minRating"
              checked={minRating === String(r)}
              onChange={() => setParam('minRating', String(r))}
              className="accent-[var(--brand)]"
            />
            {r}★ & above
          </label>
        ))}
        {minRating && (
          <button
            onClick={() => setParam('minRating', '')}
            className="text-xs text-[var(--brand)] hover:underline"
          >
            Reset
          </button>
        )}
      </FilterSection>

      <FilterSection title="Availability">
        <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setParam('inStock', e.target.checked ? 'true' : '')}
            className="accent-[var(--brand)]"
          />
          In stock only
        </label>
      </FilterSection>
    </aside>
  );
}
