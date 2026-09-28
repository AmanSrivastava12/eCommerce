import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from './api-client/resources';
import type { Category } from './api-client/types';

// GET /categories returns a flat list; nesting comes from `parentId` (null = top level).

export function childrenOf(categories: Category[], parentId: string | null) {
  return categories.filter((c) => (c.parentId ?? null) === parentId).sort((a, b) => a.name.localeCompare(b.name));
}

/** Root-first chain of ancestors of `category`, excluding the category itself. */
export function ancestorsOf(categories: Category[], category: Category) {
  const byId = new Map(categories.map((c) => [c._id, c]));
  const chain: Category[] = [];
  let parent = category.parentId ? byId.get(category.parentId) : undefined;
  // Guard against a malformed cycle in the data.
  while (parent && !chain.includes(parent)) {
    chain.unshift(parent);
    parent = parent.parentId ? byId.get(parent.parentId) : undefined;
  }
  return chain;
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
}
