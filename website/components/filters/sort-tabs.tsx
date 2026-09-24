'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

const SORT_OPTIONS = [
  { value: '', label: 'Relevance' },
  { value: 'price-asc', label: 'Price -- Low to High' },
  { value: 'price-desc', label: 'Price -- High to Low' },
  { value: 'rating', label: 'Avg. Rating' },
  { value: 'newest', label: 'Newest First' },
];

export function SortTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSort = searchParams.get('sort') ?? '';

  const setSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('sort', value);
    else params.delete('sort');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="mb-4 flex items-center gap-6 overflow-x-auto border-b border-[var(--border)] pb-0 text-sm no-scrollbar">
      <span className="shrink-0 font-medium text-[var(--foreground)]">Sort By</span>
      {SORT_OPTIONS.map((o) => {
        const active = activeSort === o.value;
        return (
          <button
            key={o.value}
            onClick={() => setSort(o.value)}
            className={`relative shrink-0 whitespace-nowrap pb-2.5 pt-1 transition-colors ${
              active ? 'font-medium text-[var(--brand)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {o.label}
            {active && (
              <motion.span
                layoutId="sort-underline"
                className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--brand)]"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
