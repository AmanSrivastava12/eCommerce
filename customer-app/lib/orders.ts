import type { Order } from './api-client/types';
import { confirm } from '../components/feedback';

export const ORDER_STEPS = ['placed', 'paid', 'shipped', 'delivered'] as const;

/** Same rule the website uses to show "Cancel order": pre-shipment and inside the window. */
export function isCancellable(order: Order) {
  return (
    (order.status === 'placed' || order.status === 'paid') &&
    !!order.cancellable_until &&
    new Date(order.cancellable_until) > new Date()
  );
}

export function confirmCancel() {
  return confirm({
    title: 'Cancel this order?',
    message: 'Any payment made will be refunded to the original payment method.',
    confirmLabel: 'Cancel order',
    cancelLabel: 'Keep order',
    danger: true,
    icon: 'close-circle-outline',
  });
}
