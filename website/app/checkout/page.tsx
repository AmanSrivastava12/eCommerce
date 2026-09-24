'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { ApiError } from '@/lib/api-client/client';
import { meApi, checkoutApi } from '@/lib/api-client/resources';
import { CheckoutForm } from './checkout-form';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export default function CheckoutPage() {
  const { data: addresses } = useQuery({ queryKey: ['addresses'], queryFn: meApi.listAddresses });
  const [addressId, setAddressId] = useState<string>('');

  const selectedDefault = addresses?.find((a) => a.isDefault)?._id ?? addresses?.[0]?._id ?? '';
  const chosenAddressId = addressId || selectedDefault;

  const startPayment = useMutation({
    mutationFn: () => checkoutApi.createPaymentIntent(chosenAddressId),
  });

  if (startPayment.data) {
    const { clientSecret, breakdown } = startPayment.data;
    if (!stripePromise) {
      return (
        <div className="mx-auto max-w-md">
          <h1 className="mb-1 text-xl font-medium text-[var(--foreground)]">Payment</h1>
          <p className="text-sm text-[var(--danger)]">
            Payments are not configured yet. Please try again later.
          </p>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 text-xl font-medium text-[var(--foreground)]">Payment</h1>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Pay with card or any other method shown below. Check &quot;Save this card&quot; to reuse it next time.
        </p>
        <div className="mb-4 space-y-1 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
          <div className="flex justify-between text-[var(--muted)]">
            <span>Subtotal</span>
            <span>${breakdown.subtotal.toFixed(2)}</span>
          </div>
          {breakdown.discountTotal > 0 && (
            <div className="flex justify-between text-[var(--discount)]">
              <span>Discount</span>
              <span>-${breakdown.discountTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-[var(--muted)]">
            <span>Shipping</span>
            <span>{breakdown.shippingFee > 0 ? `$${breakdown.shippingFee.toFixed(2)}` : 'Free'}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--border)] pt-1 font-medium text-[var(--foreground)]">
            <span>Total</span>
            <span>${breakdown.total.toFixed(2)}</span>
          </div>
        </div>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm addressId={chosenAddressId} paymentIntentId={startPayment.data.paymentIntentId} />
        </Elements>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-medium text-[var(--foreground)]">Checkout</h1>
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--foreground)]">Shipping address</p>
        {(addresses ?? []).map((address) => (
          <label
            key={address._id}
            className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
          >
            <input
              type="radio"
              name="address"
              value={address._id}
              defaultChecked={address._id === selectedDefault}
              onChange={() => setAddressId(address._id)}
              className="accent-[var(--brand)]"
            />
            <span className="text-[var(--foreground)]">
              {address.label} — {address.line1}, {address.city}, {address.postalCode} ({address.phone})
            </span>
          </label>
        ))}
        {addresses && addresses.length === 0 && (
          <p className="text-sm text-[var(--muted)]">Add a shipping address in your account before checking out.</p>
        )}
      </div>
      {startPayment.isError && (
        <p className="text-sm text-[var(--danger)]">
          {startPayment.error instanceof ApiError
            ? startPayment.error.message
            : 'Could not start checkout. Please try again.'}
        </p>
      )}
      <button
        onClick={() => startPayment.mutate()}
        disabled={!chosenAddressId || startPayment.isPending}
        className="w-full rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)] disabled:opacity-50"
      >
        {startPayment.isPending ? 'Preparing payment…' : 'Proceed to payment'}
      </button>
    </div>
  );
}
