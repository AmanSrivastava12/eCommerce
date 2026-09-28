'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client/client';
import { ordersApi } from '@/lib/api-client/resources';
import { useToastStore } from '@/lib/stores/toast-store';

export function CheckoutForm({ addressId, paymentIntentId }: { addressId: string; paymentIntentId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const push = useToastStore((s) => s.push);
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeOrder = useMutation({
    mutationFn: () => ordersApi.place(addressId, paymentIntentId),
    onSuccess: (res) => {
      push('Payment successful!', 'success');
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      router.push(`/orders/${res.order.id}`);
    },
    onError: (err) => {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Payment succeeded but we could not finish placing your order. Refresh Your Orders in a moment — it will appear once our system catches up.',
      );
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    // `if_required` keeps card payments resolving in-page instead of a full-page redirect;
    // only genuinely redirect-based methods fall through to `return_url`.
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/complete?addressId=${encodeURIComponent(addressId)}`,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed');
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      placeOrder.mutate();
    } else {
      setError('Payment did not complete. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting || placeOrder.isPending}
        className="w-full rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)] disabled:opacity-50"
      >
        {placeOrder.isPending ? 'Finishing your order…' : submitting ? 'Processing…' : 'Pay now'}
      </button>
    </form>
  );
}
