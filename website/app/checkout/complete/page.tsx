import { Suspense } from 'react';
import { CheckoutCompleteClient } from './checkout-complete-client';

export default function CheckoutCompletePage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Finishing your order…</p>}>
      <CheckoutCompleteClient />
    </Suspense>
  );
}
