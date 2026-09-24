import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '../../common/roles.enum';

@Schema()
export class Address {
  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  line1: string;

  @Prop()
  line2?: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  postalCode: string;

  @Prop({ required: true })
  country: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ default: false })
  isDefault: boolean;
}
export const AddressSchema = SchemaFactory.createForClass(Address);

@Schema({ _id: false })
export class RatingBucket {
  @Prop({ default: 0 })
  average: number;

  @Prop({ default: 0 })
  count: number;
}
export const RatingBucketSchema = SchemaFactory.createForClass(RatingBucket);

@Schema({ _id: false })
export class SellerRatingSummary {
  @Prop({ type: RatingBucketSchema, default: () => ({}) })
  overall: RatingBucket;

  @Prop({ type: RatingBucketSchema, default: () => ({}) })
  productQuality: RatingBucket;

  @Prop({ type: RatingBucketSchema, default: () => ({}) })
  deliveryTimeliness: RatingBucket;

  @Prop({ type: RatingBucketSchema, default: () => ({}) })
  packaging: RatingBucket;
}
export const SellerRatingSummarySchema = SchemaFactory.createForClass(SellerRatingSummary);

// Only the last 4 digits of the account number are stored; bankAccountRef stands in for the
// token a real payout provider would issue for the full account.
export interface PayoutDetails {
  bankAccountRef: string;
  accountHolderName?: string;
  bankName?: string;
  ifsc?: string;
  accountLast4?: string;
}

@Schema({ _id: false })
export class SellerProfile {
  @Prop({ required: true })
  businessName: string;

  @Prop({ enum: ['pending', 'verified', 'rejected'], default: 'pending' })
  verificationStatus: 'pending' | 'verified' | 'rejected';

  @Prop()
  verifiedAt?: Date;

  @Prop({ type: Object })
  payoutDetails?: PayoutDetails;

  @Prop({ type: SellerRatingSummarySchema, default: () => ({}) })
  ratingSummary: SellerRatingSummary;
}
export const SellerProfileSchema = SchemaFactory.createForClass(SellerProfile);

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
  email: string;

  // Never loaded by default: only the login flow opts in via `.select('+passwordHash')`.
  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ required: true, enum: Role, default: Role.Customer })
  role: Role;

  @Prop({ required: true })
  name: string;

  @Prop()
  phone?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop({ enum: ['male', 'female', 'other', 'prefer_not_to_say'] })
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';

  @Prop()
  profilePictureUrl?: string;

  @Prop()
  stripeCustomerId?: string;

  @Prop({ type: [AddressSchema], default: [] })
  addresses: Address[];

  @Prop({ type: SellerProfileSchema, default: null })
  sellerProfile?: SellerProfile | null;

  @Prop({ default: true })
  isActive: boolean;

  // Set by seed/seed.ts on every document it creates; unseed.ts deletes only rows flagged
  // here so it can never touch real user data, even if a real user shares no other overlap.
  @Prop({ default: false, index: true })
  isSeedData: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Defense in depth: even a document that was loaded with the hash (e.g. straight from
// create()) never serializes it into an API response.
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const { passwordHash: _omit, ...rest } = ret as typeof ret & { passwordHash?: string };
    return rest;
  },
});
