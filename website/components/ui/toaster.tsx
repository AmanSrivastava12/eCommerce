'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore } from '@/lib/stores/toast-store';

const VARIANT_STYLES: Record<string, string> = {
  success: 'bg-[var(--brand)] text-[var(--brand-foreground)]',
  error: 'bg-[var(--danger)] text-white',
  info: 'bg-[var(--foreground)] text-[var(--surface)]',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className={`pointer-events-auto rounded-full px-4 py-2 text-sm font-medium shadow-lg ${VARIANT_STYLES[toast.variant]}`}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
