import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class WishlistItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  sku: string;

  @Prop({ default: 'My Wishlist' })
  collectionName: string;

  @Prop({ default: Date.now })
  addedAt: Date;
}
const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

export type WishlistDocument = Wishlist & Document;

@Schema()
export class Wishlist {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: [WishlistItemSchema], default: [] })
  items: WishlistItem[];
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);
