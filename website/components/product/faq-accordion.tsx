'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function FaqAccordion({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (faqs.length === 0) return null;

  return (
    <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
      {faqs.map((faq, i) => (
        <div key={i}>
          <button
            className="flex w-full items-center justify-between p-3 text-left text-sm font-medium text-[var(--foreground)]"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
          >
            {faq.question}
            <motion.span
              animate={{ rotate: openIndex === i ? 45 : 0 }}
              transition={{ duration: 0.15 }}
              className="ml-2 text-[var(--brand)]"
            >
              +
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {openIndex === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <p className="px-3 pb-3 text-sm text-[var(--muted)]">{faq.answer}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
