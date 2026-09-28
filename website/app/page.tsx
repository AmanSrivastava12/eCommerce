import Link from 'next/link';
import { ProductGrid } from '@/components/product/product-grid';

const BANNERS = [
  { title: 'Festive Sale is Live', subtitle: 'Up to 50% off on Electronics & more' },
  { title: 'New Season Fashion', subtitle: 'Flat 20% off on top brands' },
  { title: 'Home Essentials', subtitle: 'Everything for your kitchen & home' },
];

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-medium text-[var(--foreground)]">{title}</h2>
      {href && (
        <Link href={href} className="text-sm font-medium text-[var(--brand)] hover:underline">
          View All
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="grid gap-3 sm:grid-cols-3">
        {BANNERS.map((banner) => (
          <div
            key={banner.title}
            className="hover-lift rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6"
          >
            <p className="text-lg font-medium text-[var(--foreground)]">{banner.title}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{banner.subtitle}</p>
            <Link
              href="/search"
              className="mt-4 inline-block rounded-md border border-[var(--brand)] px-4 py-1.5 text-xs font-medium text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-[var(--brand-foreground)]"
            >
              Shop Now
            </Link>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <SectionHeader title="Deals of the Day" href="/search?sort=price-asc" />
        <ProductGrid query={{ sort: 'price-asc' }} enablePriority />
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <SectionHeader title="Top Rated Products" href="/search?sort=rating" />
        <ProductGrid query={{ sort: 'rating' }} />
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <SectionHeader title="New Arrivals" href="/search?sort=newest" />
        <ProductGrid query={{ sort: 'newest' }} />
      </section>
    </div>
  );
}
