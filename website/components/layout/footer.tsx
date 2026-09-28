'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const COLUMNS = [
  {
    title: 'About',
    links: [
      { label: 'Contact Us', href: '/contact-us' },
      { label: 'About Us', href: '/about-us' },
      { label: 'Careers', href: '/careers' },
      { label: 'Shopwave Stories', href: '/stories' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Payments', href: '/payments' },
      { label: 'Shipping', href: '/shipping' },
      { label: 'Cancellation & Returns', href: '/cancellation-returns' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  {
    title: 'Policy',
    links: [
      { label: 'Return Policy', href: '/return-policy' },
      { label: 'Terms Of Use', href: '/terms' },
      { label: 'Security', href: '/security' },
      { label: 'Privacy', href: '/privacy' },
    ],
  },
  {
    title: 'Social',
    links: [
      { label: 'Facebook', href: 'https://facebook.com' },
      { label: 'Twitter', href: 'https://twitter.com' },
      { label: 'Instagram', href: 'https://instagram.com' },
      { label: 'YouTube', href: 'https://youtube.com' },
    ],
  },
];

export function Footer() {
  const pathname = usePathname();

  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4 sm:px-6">
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{col.title}</p>
            <ul className="space-y-2">
              {col.links.map((link) => {
                const active = pathname === link.href;
                return (
                  <li key={link.label}>
                    {link.href.startsWith('http') ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--foreground)] transition hover:text-[var(--brand)]"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className={`text-sm transition hover:text-[var(--brand)] ${
                          active ? 'font-medium text-[var(--brand)] underline underline-offset-4' : 'text-[var(--foreground)]'
                        }`}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--border)] px-4 py-4 text-center text-xs text-[var(--muted)] sm:px-6">
        © {new Date().getFullYear()} Shopwave. All rights reserved.
      </div>
    </footer>
  );
}
