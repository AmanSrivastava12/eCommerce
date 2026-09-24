'use client';

import { motion } from 'framer-motion';

export function ErrorState({
  title = 'Something went wrong',
  subtitle = "We couldn't load this right now. Check your connection and try again.",
  onRetry,
}: {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--danger)]/40 px-6 py-16 text-center"
    >
      <svg viewBox="0 0 24 24" className="h-12 w-12 fill-none stroke-[var(--danger)]" strokeWidth={1.25}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
      <p className="text-base font-medium text-[var(--foreground)]">{title}</p>
      <p className="max-w-xs text-sm text-[var(--muted)]">{subtitle}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 rounded-md bg-[var(--brand)] px-5 py-2 text-sm font-medium text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)]"
        >
          Try again
        </button>
      )}
    </motion.div>
  );
}
