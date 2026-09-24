import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CouponsService } from '../coupons/coupons.service';
import { ProductsService } from '../catalog/products.service';
import { AddCartItemDto, ApplyCouponDto, UpdateCartItemDto } from './dto/cart.dto';
import { Cart, CartDocument } from './schemas/cart.schema';

const GUEST_CART_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private productsService: ProductsService,
    private couponsService: CouponsService,
  ) {}

  private async findOrCreateCart(userId?: string, guestSessionId?: string) {
    if (!userId && !guestSessionId) {
      throw new BadRequestException('Either an authenticated user or a guestSessionId is required');
    }
    const query = userId ? { userId: new Types.ObjectId(userId) } : { guestSessionId };
    let cart = await this.cartModel.findOne(query).exec();
    if (!cart) {
      cart = await this.cartModel.create({
        userId: userId ? new Types.ObjectId(userId) : null,
        guestSessionId: userId ? null : guestSessionId,
        items: [],
        appliedCoupons: [],
        expiresAt: userId ? null : new Date(Date.now() + GUEST_CART_TTL_MS),
      });
    }
    return cart;
  }

  async getCart(userId?: string, guestSessionId?: string) {
    return this.findOrCreateCart(userId, guestSessionId);
  }

  async addItem(userId: string | undefined, dto: AddCartItemDto) {
    const cart = await this.findOrCreateCart(userId, dto.guestSessionId);
    const { price } = await this.productsService.findPublicById(dto.productId);

    const existing = cart.items.find((i) => i.sku === dto.sku);
    if (existing) {
      existing.quantity += dto.quantity;
    } else {
      cart.items.push({
        productId: dto.productId,
        sku: dto.sku,
        quantity: dto.quantity,
        priceAtAdd: price.effectivePrice,
      });
    }
    await this.touch(cart);
    return cart;
  }

  async updateItem(
    userId: string | undefined,
    sku: string,
    dto: UpdateCartItemDto,
  ) {
    const cart = await this.findOrCreateCart(userId, dto.guestSessionId);
    const item = cart.items.find((i) => i.sku === sku);
    if (!item) throw new NotFoundException('Item not in cart');
    item.quantity = dto.quantity;
    await this.touch(cart);
    return cart;
  }

  async removeItem(userId: string | undefined, sku: string, guestSessionId?: string) {
    const cart = await this.findOrCreateCart(userId, guestSessionId);
    cart.items = cart.items.filter((i) => i.sku !== sku) as any;
    await this.touch(cart);
    return cart;
  }

  async applyCoupon(userId: string | undefined, dto: ApplyCouponDto) {
    const cart = await this.findOrCreateCart(userId, dto.guestSessionId);
    const subtotal = cart.items.reduce((sum, i) => sum + i.priceAtAdd * i.quantity, 0);
    const { coupon, discountApplied } = await this.couponsService.validateForCart(
      dto.code,
      subtotal,
      0,
    );
    cart.appliedCoupons = cart.appliedCoupons.filter((c) => c.code !== coupon.code) as any;
    cart.appliedCoupons.push({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountApplied,
    });
    await this.touch(cart);
    return cart;
  }

  async removeCoupon(userId: string | undefined, code: string, guestSessionId?: string) {
    const cart = await this.findOrCreateCart(userId, guestSessionId);
    cart.appliedCoupons = cart.appliedCoupons.filter(
      (c) => c.code !== code.toUpperCase(),
    ) as any;
    await this.touch(cart);
    return cart;
  }

  /** Merges a guest cart's items into the user's cart on login, then discards the guest cart. */
  async mergeGuestCart(userId: string, guestSessionId: string) {
    const guestCart = await this.cartModel.findOne({ guestSessionId }).exec();
    if (!guestCart || guestCart.items.length === 0) return this.findOrCreateCart(userId);

    const userCart = await this.findOrCreateCart(userId);
    for (const item of guestCart.items) {
      const existing = userCart.items.find((i) => i.sku === item.sku);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        userCart.items.push(item);
      }
    }
    await this.touch(userCart);
    await guestCart.deleteOne();
    return userCart;
  }

  async clear(cartId: Types.ObjectId) {
    await this.cartModel.findByIdAndUpdate(cartId, {
      $set: { items: [], appliedCoupons: [], pendingPaymentIntentId: null },
    });
  }

  private async touch(cart: CartDocument) {
    cart.updatedAt = new Date();
    cart.lastActivityAt = new Date();
    cart.reminderSentAt = null;
    if (!cart.userId) {
      cart.expiresAt = new Date(Date.now() + GUEST_CART_TTL_MS);
    }
    await cart.save();
  }
}
