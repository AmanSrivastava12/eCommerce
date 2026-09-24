'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client/client';
import { ordersApi } from '@/lib/api-client/resources';
import { useToastStore } from '@/lib/stores/toast-store';

/** Only reached for redirect-based payment methods — cards resolve in-page (see
 * checkout-form.tsx) and never land here. Stripe appends `payment_intent` and
 * `redirect_status` to this URL after the customer completes payment elsewhere. */
export function CheckoutCompleteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const push = useToastStore((s) => s.push);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  const addressId = searchParams.get('addressId');
  const paymentIntentId = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!addressId || !paymentIntentId) {
      setError('Missing payment details. If you were charged, check Your Orders in a moment.');
      return;
    }
    if (redirectStatus !== 'succeeded') {
      setError('Payment was not completed.');
      return;
    }
    ordersApi
      .place(addressId, paymentIntentId)
      .then((res) => {
        push('Payment successful!', 'success');
        queryClient.invalidateQueries({ queryKey: ['cart'] });
        router.push(`/orders/${res.order.id}`);
      })
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Payment succeeded but we could not finish placing your order. Check Your Orders in a moment — it will appear once our system catches up.',
        );
      });
  }, [addressId, paymentIntentId, redirectStatus, push, router, queryClient]);

  return (
    <div className="mx-auto max-w-md space-y-3 text-center">
      <h1 className="text-xl font-medium text-[var(--foreground)]">Finishing your order…</h1>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : <p className="text-sm text-[var(--muted)]">Just a moment.</p>}
    </div>
  );
}
