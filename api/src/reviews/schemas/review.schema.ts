import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Review {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  sku: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ min: 1, max: 5, default: null })
  deliveryRating?: number | null;

  @Prop({ min: 1, max: 5, default: null })
  packagingRating?: number | null;

  @Prop({ default: null })
  title?: string | null;

  @Prop({ required: true })
  comment: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: false, index: true })
  isSeedData: boolean;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
ReviewSchema.index({ productId: 1, sku: 1, userId: 1 }, { unique: true });
