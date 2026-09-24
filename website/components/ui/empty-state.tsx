'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const ICONS: Record<string, React.ReactNode> = {
  orders: (
    <svg viewBox="0 0 24 24" className="h-16 w-16 fill-none stroke-current" strokeWidth={1.25}>
      <path d="M4 7h16l-1.5 12.5a1 1 0 0 1-1 .9H6.5a1 1 0 0 1-1-.9L4 7Z" />
      <path d="M8 7V5a4 4 0 0 1 8 0v2" />
    </svg>
  ),
  wishlist: (
    <svg viewBox="0 0 24 24" className="h-16 w-16 fill-none stroke-current" strokeWidth={1.25}>
      <path d="M12 21s-6.7-4.35-9.33-8.2C.86 10.1 1.4 6.5 4.3 5.05c2.3-1.15 4.9-.3 6.2 1.7l1.5 2.3 1.5-2.3c1.3-2 3.9-2.85 6.2-1.7 2.9 1.45 3.44 5.05 1.63 7.75C18.7 16.65 12 21 12 21z" />
    </svg>
  ),
  address: (
    <svg viewBox="0 0 24 24" className="h-16 w-16 fill-none stroke-current" strokeWidth={1.25}>
      <path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" className="h-16 w-16 fill-none stroke-current" strokeWidth={1.25}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  box: (
    <svg viewBox="0 0 24 24" className="h-16 w-16 fill-none stroke-current" strokeWidth={1.25}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  ),
};

export function EmptyState({
  icon = 'box',
  title,
  subtitle,
  actionLabel,
  actionHref,
}: {
  icon?: keyof typeof ICONS;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--border)] px-6 py-16 text-center"
    >
      <div className="text-[var(--border)]">{ICONS[icon]}</div>
      <p className="text-base font-medium text-[var(--foreground)]">{title}</p>
      {subtitle && <p className="max-w-xs text-sm text-[var(--muted)]">{subtitle}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-2 rounded-md bg-[var(--brand)] px-5 py-2 text-sm font-medium text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)]"
        >
          {actionLabel}
        </Link>
      )}
    </motion.div>
  );
}
