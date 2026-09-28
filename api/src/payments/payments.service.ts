import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY') ?? 'sk_test_placeholder');
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    orderId: string,
    options: { customerId?: string; savePaymentMethod?: boolean } = {},
  ) {
    return this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      metadata: { orderId },
      automatic_payment_methods: { enabled: true },
      ...(options.customerId ? { customer: options.customerId } : {}),
      // Attaching a customer + this flag is what makes the Payment Element on the frontend
      // both offer a "save this card" checkbox and, on future checkouts, list previously
      // saved cards for the same customer — no separate SetupIntent flow needed.
      ...(options.savePaymentMethod ? { setup_future_usage: 'off_session' as const } : {}),
    });
  }

  /**
   * PaymentIntent for a cart that has not become an order yet. The order is only created
   * after this intent succeeds (see OrdersService.placeOrder), so metadata carries what the
   * server needs to re-verify it: who is paying and where it ships.
   */
  async upsertCheckoutIntent(params: {
    existingId?: string | null;
    amount: number;
    currency: string;
    customerId: string;
    userId: string;
    addressId: string;
  }) {
    const amount = Math.round(params.amount * 100);
    const metadata = { kind: 'checkout', userId: params.userId, addressId: params.addressId };
    if (params.existingId) {
      try {
        const existing = await this.stripe.paymentIntents.retrieve(params.existingId);
        // Reuse an unfinished intent (same customer/currency) instead of piling up new ones
        // every time the customer revisits checkout.
        if (
          existing.customer === params.customerId &&
          existing.currency === params.currency.toLowerCase() &&
          ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existing.status)
        ) {
          return this.stripe.paymentIntents.update(existing.id, { amount, metadata });
        }
      } catch {
        // Unknown/expired id — fall through and create a fresh intent.
      }
    }
    return this.stripe.paymentIntents.create({
      amount,
      currency: params.currency.toLowerCase(),
      customer: params.customerId,
      metadata,
      automatic_payment_methods: { enabled: true },
      setup_future_usage: 'off_session',
    });
  }

  retrievePaymentIntent(id: string) {
    return this.stripe.paymentIntents.retrieve(id, { expand: ['latest_charge'] });
  }

  refund(paymentIntentId: string, reason: string) {
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer',
      metadata: { reason },
    });
  }

  /** Creates the Stripe Customer for a user on first use and remembers the id on the user doc. */
  async getOrCreateCustomerId(user: { _id: unknown; email: string; name: string; stripeCustomerId?: string }): Promise<string> {
    if (user.stripeCustomerId) {
      // A stored id can go stale if the Stripe account backing STRIPE_SECRET_KEY changes
      // (e.g. switching test accounts) — fall through to creating a fresh customer instead
      // of failing checkout outright.
      try {
        const existing = await this.stripe.customers.retrieve(user.stripeCustomerId);
        if (!existing.deleted) return existing.id;
      } catch {
        // not found on this account — recreate below
      }
    }
    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: String(user._id) },
    });
    return customer.id;
  }

  async listSavedPaymentMethods(customerId: string) {
    const [methods, customer] = await Promise.all([
      this.stripe.paymentMethods.list({ customer: customerId, type: 'card' }),
      this.stripe.customers.retrieve(customerId),
    ]);
    let defaultId: string | undefined;
    if (!customer.deleted) {
      const active = customer as Stripe.Customer;
      if (typeof active.invoice_settings?.default_payment_method === 'string') {
        defaultId = active.invoice_settings.default_payment_method;
      }
    }
    return methods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand ?? 'card',
      last4: pm.card?.last4 ?? '????',
      expMonth: pm.card?.exp_month ?? 0,
      expYear: pm.card?.exp_year ?? 0,
      isDefault: pm.id === defaultId,
    }));
  }

  async detachPaymentMethod(paymentMethodId: string, customerId: string) {
    const pm = await this.stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== customerId) {
      throw new Error('This payment method does not belong to you');
    }
    await this.stripe.paymentMethods.detach(paymentMethodId);
  }

  constructWebhookEvent(payload: Buffer, signature: string) {
    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET')!;
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
