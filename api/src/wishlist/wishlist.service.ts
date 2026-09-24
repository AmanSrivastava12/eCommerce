import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wishlist, WishlistDocument } from './schemas/wishlist.schema';

const DEFAULT_COLLECTION = 'My Wishlist';

@Injectable()
export class WishlistService {
  constructor(@InjectModel(Wishlist.name) private wishlistModel: Model<WishlistDocument>) {}

  private async findOrCreate(userId: string) {
    let wishlist = await this.wishlistModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
    if (!wishlist) {
      wishlist = await this.wishlistModel.create({ userId: new Types.ObjectId(userId), items: [] });
    }
    return wishlist;
  }

  async get(userId: string) {
    return this.findOrCreate(userId);
  }

  async addItem(userId: string, productId: string, sku: string, collectionName?: string) {
    const wishlist = await this.findOrCreate(userId);
    const existing = wishlist.items.find((i) => i.productId === productId && i.sku === sku);
    if (existing) {
      if (collectionName) existing.collectionName = collectionName;
    } else {
      wishlist.items.push({
        productId,
        sku,
        collectionName: collectionName || DEFAULT_COLLECTION,
        addedAt: new Date(),
      });
    }
    await wishlist.save();
    return wishlist;
  }

  async removeItem(userId: string, sku: string) {
    const wishlist = await this.findOrCreate(userId);
    wishlist.items = wishlist.items.filter((i) => i.sku !== sku) as any;
    await wishlist.save();
    return wishlist;
  }

  async moveItem(userId: string, sku: string, collectionName: string) {
    const wishlist = await this.findOrCreate(userId);
    const item = wishlist.items.find((i) => i.sku === sku);
    if (item) {
      item.collectionName = collectionName || DEFAULT_COLLECTION;
      await wishlist.save();
    }
    return wishlist;
  }

  async renameCollection(userId: string, from: string, to: string) {
    const wishlist = await this.findOrCreate(userId);
    wishlist.items.forEach((i) => {
      if (i.collectionName === from) i.collectionName = to;
    });
    await wishlist.save();
    return wishlist;
  }

  async deleteCollection(userId: string, name: string) {
    const wishlist = await this.findOrCreate(userId);
    wishlist.items = wishlist.items.filter((i) => i.collectionName !== name) as any;
    await wishlist.save();
    return wishlist;
  }
}
