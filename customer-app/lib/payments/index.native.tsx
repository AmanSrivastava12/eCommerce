import type { ReactNode } from 'react';
import * as Linking from 'expo-linking';
import { PaymentSheetError, StripeProvider, useStripe } from '@stripe/stripe-react-native';
import type { PaymentResult } from './types';

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export function PaymentsProvider({ children }: { children: ReactNode }) {
  return (
    <StripeProvider publishableKey={PUBLISHABLE_KEY} urlScheme="shopwave">
      <>{children}</>
    </StripeProvider>
  );
}

/**
 * Native counterpart of the website's Stripe `PaymentElement` + `confirmPayment`: presents
 * Stripe's PaymentSheet for the PaymentIntent the API created with the order. As on the web,
 * the order flips to "paid" server-side via the Stripe webhook, not from this result.
 */
export function usePayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  return async (clientSecret: string): Promise<PaymentResult> => {
    const init = await initPaymentSheet({
      merchantDisplayName: 'Shopwave',
      paymentIntentClientSecret: clientSecret,
      returnURL: Linking.createURL('stripe-redirect'),
    });
    if (init.error) return { status: 'failed', message: init.error.message };

    const { error } = await presentPaymentSheet();
    if (!error) return { status: 'succeeded' };
    if (error.code === PaymentSheetError.Canceled) return { status: 'cancelled' };
    return { status: 'failed', message: error.message };
  };
}
