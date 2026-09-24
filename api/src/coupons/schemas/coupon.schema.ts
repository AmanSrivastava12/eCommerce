import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CouponDocument = Coupon & Document;

@Schema({ timestamps: true })
export class Coupon {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true, enum: ['percent', 'flat'] })
  discountType: 'percent' | 'flat';

  @Prop({ required: true, min: 0 })
  discountValue: number;

  @Prop({ default: null })
  minCartValue?: number | null;

  @Prop({ default: null })
  maxDiscountAmount?: number | null;

  @Prop({ required: true })
  validFrom: Date;

  @Prop({ required: true })
  validTo: Date;

  @Prop({ default: null })
  usageLimitPerUser?: number | null;

  @Prop({ default: true })
  active: boolean;

  @Prop({ default: false, index: true })
  isSeedData: boolean;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
