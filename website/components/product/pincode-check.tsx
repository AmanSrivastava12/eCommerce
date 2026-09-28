'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { productsApi } from '@/lib/api-client/resources';

export function PincodeCheck({ productId }: { productId: string }) {
  const [pincode, setPincode] = useState('');
  const [result, setResult] = useState<{ serviceable: boolean; estimatedDeliveryDays: number | null } | null>(null);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    if (!pincode) return;
    setChecking(true);
    try {
      setResult(await productsApi.serviceability(productId, pincode));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="text-sm">
      <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-1.5 pl-3 sm:gap-3">
        <span className="shrink-0 whitespace-nowrap text-xs font-medium text-[var(--foreground)] sm:text-sm">
          Check delivery at your location
        </span>
        <input
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          placeholder="Pincode"
          maxLength={6}
          className="w-16 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm outline-none transition focus:border-[var(--brand)] sm:w-auto sm:px-3"
        />
        <button
          onClick={check}
          disabled={checking}
          className="shrink-0 rounded-md bg-[var(--brand)] px-3 py-1.5 text-sm font-medium text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)] disabled:opacity-50 sm:px-5"
        >
          {checking ? '…' : 'Check'}
        </button>
      </div>
      <AnimatePresence>
        {result && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-1.5 ${result.serviceable ? 'text-[var(--discount)]' : 'text-[var(--danger)]'}`}
          >
            {result.serviceable
              ? `Delivered in ~${result.estimatedDeliveryDays} days`
              : 'Not deliverable to this pincode'}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
