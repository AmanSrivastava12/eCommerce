import type { ReactNode } from 'react';
import type { PaymentResult } from './types';

// Web fallback: @stripe/stripe-react-native has no web build, so the web preview can place
// orders but not pay for them. Real payments run on iOS/Android (see index.native.tsx).
export function PaymentsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function usePayment() {
  return async (_clientSecret: string): Promise<PaymentResult> => ({
    status: 'failed',
    message: 'Payments are only available in the iOS and Android app.',
  });
}
