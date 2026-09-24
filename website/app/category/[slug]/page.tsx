import { Suspense } from 'react';
import { categoriesApi } from '@/lib/api-client/resources';
import { CategoryPageClient } from './category-page-client';

export default async function CategoryPage(props: PageProps<'/category/[slug]'>) {
  const { slug } = await props.params;
  const initialCategories = await categoriesApi.list().catch(() => undefined);
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <CategoryPageClient slug={slug} initialCategories={initialCategories} />
    </Suspense>
  );
}
