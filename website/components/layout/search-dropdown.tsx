'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api-client/resources';
import { useDebouncedValue } from '@/lib/hooks/use-debounce';

export function SearchDropdown() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const debouncedQuery = useDebouncedValue(query.trim(), 1500);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: results, isFetching } = useQuery({
    queryKey: ['search-preview', debouncedQuery],
    queryFn: () => productsApi.browse({ search: debouncedQuery }),
    enabled: debouncedQuery.length > 1,
  });

  const showDropdown = focused && query.trim().length > 1;
  // While the user is still typing (query hasn't caught up to the debounced value yet),
  // show a waiting state instead of stale results from a previous keystroke.
  const isTyping = query.trim() !== debouncedQuery;

  const goToSearch = () => {
    router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search');
    setFocused(false);
  };

  return (
    <div className="relative flex-1">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToSearch();
        }}
      >
        <div className="flex items-center overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] transition focus-within:border-[var(--brand)]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              blurTimeout.current = setTimeout(() => setFocused(false), 150);
            }}
            placeholder="Search for products, brands and more"
            className="w-full bg-transparent px-4 py-2 text-sm outline-none placeholder:text-[var(--muted)]"
          />
          <button
            type="submit"
            className="flex h-full items-center px-3 text-[var(--muted)] hover:text-[var(--brand)]"
            aria-label="Search"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </div>
      </form>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-lg"
          >
            {isTyping || isFetching ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--muted)]">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--brand)]" />
                Searching…
              </div>
            ) : results && results.length > 0 ? (
              <ul>
                {results.slice(0, 6).map((product) => (
                  <li key={product._id}>
                    <Link
                      href={`/product/${product._id}`}
                      onMouseDown={() => setFocused(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-[var(--cream)]"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-[var(--background)]">
                        <Image src={product.images.main} alt="" fill sizes="40px" className="object-cover" />
                      </div>
                      <span className="line-clamp-1 flex-1">{product.title}</span>
                      <span className="shrink-0 text-[var(--muted)]">${product.pricing.basePrice.toFixed(0)}</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    onMouseDown={goToSearch}
                    className="block w-full px-4 py-2.5 text-left text-sm font-medium text-[var(--brand)] hover:bg-[var(--cream)]"
                  >
                    View all results for &ldquo;{debouncedQuery}&rdquo;
                  </button>
                </li>
              </ul>
            ) : (
              <p className="px-4 py-3 text-sm text-[var(--muted)]">No products found.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
