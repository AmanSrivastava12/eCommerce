import { Suspense } from 'react';
import { categoriesApi } from '@/lib/api-client/resources';
import { SearchPageClient } from './search-page-client';

export default async function SearchPage() {
  const initialCategories = await categoriesApi.list().catch(() => undefined);
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <SearchPageClient initialCategories={initialCategories} />
    </Suspense>
  );
}
