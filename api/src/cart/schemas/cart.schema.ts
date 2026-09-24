import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class CartItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  sku: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  priceAtAdd: number;
}
const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({ _id: false })
export class AppliedCoupon {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true, enum: ['percent', 'flat'] })
  discountType: 'percent' | 'flat';

  @Prop({ required: true })
  discountValue: number;

  @Prop({ required: true })
  discountApplied: number;
}
const AppliedCouponSchema = SchemaFactory.createForClass(AppliedCoupon);

export type CartDocument = Cart & Document;

@Schema()
export class Cart {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  userId?: Types.ObjectId | null;

  @Prop({ default: null, index: true })
  guestSessionId?: string | null;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];

  @Prop({ type: [AppliedCouponSchema], default: [] })
  appliedCoupons: AppliedCoupon[];

  // Unfinished checkout PaymentIntent, reused if the customer returns to checkout.
  @Prop({ type: String, default: null })
  pendingPaymentIntentId?: string | null;

  @Prop({ default: Date.now })
  updatedAt: Date;

  @Prop({ default: Date.now })
  lastActivityAt: Date;

  // Debounces the abandoned-cart job so it fires once per idle period, not on every scan tick.
  // Cleared whenever the cart's items change again (see CartService.touch).
  @Prop({ default: null })
  reminderSentAt?: Date | null;

  @Prop({ default: null, expires: 0 })
  expiresAt?: Date | null;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
