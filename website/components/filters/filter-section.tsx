'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-[var(--border)] pb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-1 text-sm font-medium text-[var(--foreground)]"
      >
        {title}
        <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.15 }} className="text-[var(--muted)]">
          ▾
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
