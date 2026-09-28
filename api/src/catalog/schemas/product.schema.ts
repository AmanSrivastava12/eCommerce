import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class DescriptionSection {
  @Prop({ required: true })
  heading: string;

  @Prop({ required: true })
  content: string;
}
const DescriptionSectionSchema = SchemaFactory.createForClass(DescriptionSection);

@Schema({ _id: false })
export class SpecItem {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  value: string;
}
const SpecItemSchema = SchemaFactory.createForClass(SpecItem);

@Schema({ _id: false })
export class SpecGroup {
  @Prop({ required: true })
  group: string;

  @Prop({ type: [SpecItemSchema], default: [] })
  items: SpecItem[];
}
const SpecGroupSchema = SchemaFactory.createForClass(SpecGroup);

@Schema({ _id: false })
export class ProductDescription {
  @Prop({ required: true })
  short: string;

  @Prop({ type: [DescriptionSectionSchema], default: [] })
  sections: DescriptionSection[];

  @Prop({ type: [SpecGroupSchema], default: [] })
  specifications: SpecGroup[];
}
const ProductDescriptionSchema = SchemaFactory.createForClass(ProductDescription);

@Schema({ _id: false })
export class Faq {
  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  answer: string;
}
const FaqSchema = SchemaFactory.createForClass(Faq);

@Schema({ _id: false })
export class ProductImages {
  @Prop({ required: true })
  main: string;

  @Prop({ type: [String], default: [] })
  gallery: string[];
}
const ProductImagesSchema = SchemaFactory.createForClass(ProductImages);

@Schema({ _id: false })
export class ProductPricing {
  @Prop({ required: true, min: 0 })
  basePrice: number;

  @Prop({ required: true, default: 'USD' })
  currency: string;

  @Prop({ min: 0, max: 100, default: null })
  discountPercent?: number | null;

  @Prop({ min: 0, default: null })
  discountAmount?: number | null;

  @Prop({ type: Types.ObjectId, ref: 'Sale', default: null })
  activeSaleId?: Types.ObjectId | null;

  @Prop({ min: 0, default: null })
  salePrice?: number | null;
}
const ProductPricingSchema = SchemaFactory.createForClass(ProductPricing);

@Schema({ _id: false })
export class ProductVariant {
  @Prop({ required: true })
  sku: string;

  @Prop({ type: Object, default: {} })
  attributes: Record<string, string>;

  @Prop({ min: 0, default: null })
  priceOverride?: number | null;

  @Prop({ type: [String], default: [] })
  images: string[];
}
const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);

@Schema({ _id: false })
export class ProductFulfillment {
  @Prop({ default: null })
  warranty?: string | null;

  @Prop({ default: false })
  isAssured: boolean;

  @Prop({ default: null })
  returnWindowDays?: number | null;

  @Prop({ default: null })
  replacementWindowDays?: number | null;

  // Flat delivery charge applied once per product in an order; 0 means free shipping.
  @Prop({ min: 0, default: 0 })
  shippingFee: number;

  @Prop({ required: true })
  shipsFromPincode: string;

  @Prop({ type: [String], default: null })
  serviceablePincodes?: string[] | null;

  @Prop({ required: true, default: 5 })
  estimatedDeliveryDays: number;
}
const ProductFulfillmentSchema = SchemaFactory.createForClass(ProductFulfillment);

@Schema({ _id: false })
export class RatingSummary {
  @Prop({ default: 0 })
  average: number;

  @Prop({ default: 0 })
  count: number;
}
const RatingSummarySchema = SchemaFactory.createForClass(RatingSummary);

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  sellerId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  categoryId: Types.ObjectId;

  @Prop({ type: ProductDescriptionSchema, required: true })
  description: ProductDescription;

  @Prop({ type: [FaqSchema], default: [] })
  faqs: Faq[];

  @Prop({ type: ProductImagesSchema, required: true })
  images: ProductImages;

  @Prop({ type: ProductPricingSchema, required: true })
  pricing: ProductPricing;

  @Prop({ type: [ProductVariantSchema], default: [] })
  variants: ProductVariant[];

  @Prop({ type: ProductFulfillmentSchema, required: true })
  fulfillment: ProductFulfillment;

  @Prop({ type: RatingSummarySchema, default: () => ({}) })
  ratingSummary: RatingSummary;

  @Prop({ enum: ['draft', 'active', 'inactive'], default: 'draft', index: true })
  status: 'draft' | 'active' | 'inactive';

  @Prop({ default: false, index: true })
  isSeedData: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ title: 'text', 'description.short': 'text' });
