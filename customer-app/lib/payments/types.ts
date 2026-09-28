export type PaymentResult = { status: 'succeeded' } | { status: 'cancelled' } | { status: 'failed'; message?: string };
