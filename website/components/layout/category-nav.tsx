'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { categoriesApi } from '@/lib/api-client/resources';
import { Category } from '@/lib/api-client/types';

export function CategoryNav() {
  const pathname = usePathname();
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const [openId, setOpenId] = useState<string | null>(null);

  if (!categories || categories.length === 0) return null;

  const topLevel = categories.filter((c) => !c.parentId);
  const childrenOf = (parentId: string) => categories.filter((c) => c.parentId === parentId);

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 no-scrollbar sm:px-6">
        {topLevel.map((category) => {
          const children = childrenOf(category._id);
          const active =
            pathname === `/category/${category.slug}` ||
            children.some((c) => pathname === `/category/${c.slug}`);

          return (
            <div
              key={category._id}
              className="relative shrink-0"
              onMouseEnter={() => setOpenId(category._id)}
              onMouseLeave={() => setOpenId((id) => (id === category._id ? null : id))}
            >
              <Link
                href={`/category/${category.slug}`}
                className={`relative flex items-center gap-1 px-3 py-2.5 text-sm transition-all duration-200 hover:-translate-y-0.5 ${
                  active ? 'font-medium text-[var(--brand)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {category.name}
                {children.length > 0 && (
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current" strokeWidth={2}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                )}
                {active && (
                  <motion.span
                    layoutId="category-underline"
                    className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[var(--brand)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
              </Link>

              <AnimatePresence>
                {openId === category._id && children.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full z-50 w-48 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
                  >
                    {children.map((child) => (
                      <Link
                        key={child._id}
                        href={`/category/${child.slug}`}
                        className={`block px-4 py-2 text-sm transition hover:bg-[var(--cream)] ${
                          pathname === `/category/${child.slug}`
                            ? 'font-medium text-[var(--brand)]'
                            : 'text-[var(--foreground)]'
                        }`}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
