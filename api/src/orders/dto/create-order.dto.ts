import { IsString, Matches } from 'class-validator';

export class CheckoutPaymentDto {
  @IsString() addressId: string;
}

export class CreateOrderDto {
  @IsString() addressId: string;

  /** The Stripe PaymentIntent the customer has already paid; the order is created from it. */
  @Matches(/^pi_[A-Za-z0-9]+$/, { message: 'Invalid payment reference' })
  paymentIntentId: string;
}
