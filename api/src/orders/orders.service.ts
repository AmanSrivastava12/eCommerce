import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CartService } from '../cart/cart.service';
import { Cart, CartDocument } from '../cart/schemas/cart.schema';
import { Product, ProductDocument } from '../catalog/schemas/product.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CouponsService } from '../coupons/coupons.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { UsersService } from '../users/users.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';

const CANCELLATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour, per the plan
// The Stripe sandbox account is US-based, so charges settle in USD.
const CHECKOUT_CURRENCY = 'USD';
const MIN_CHARGE = 0.5; // Stripe's minimum USD charge

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order) private ordersRepo: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemsRepo: Repository<OrderItem>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private dataSource: DataSource,
    private cartService: CartService,
    private inventoryService: InventoryService,
    private couponsService: CouponsService,
    private usersService: UsersService,
    private paymentsService: PaymentsService,
    private notifications: NotificationsService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  /**
   * Server-side price of the user's current cart. Every checkout step recomputes this rather
   * than trusting anything the client (or the cart's cached coupon amounts) says.
   */
  private async priceCart(userId: string, addressId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const address = (user.addresses as any[]).find((a) => String(a._id ?? a.id) === addressId);
    if (!address) throw new BadRequestException('Address not found');

    const cart = await this.cartService.getCart(userId);
    if (cart.items.length === 0) throw new BadRequestException('Cart is empty');

    // Fail before payment, not after, when something in the cart can no longer be fulfilled.
    const inventory = await this.inventoryService.findBySkus(cart.items.map((i) => i.sku));
    for (const item of cart.items) {
      const inv = inventory.find((x) => x.sku === item.sku);
      if (!inv || inv.quantity - inv.reserved_qty < item.quantity) {
        throw new BadRequestException(`Only ${Math.max(0, (inv?.quantity ?? 0) - (inv?.reserved_qty ?? 0))} left of SKU ${item.sku} — update your cart`);
      }
    }

    const subtotal = Number(cart.items.reduce((sum, i) => sum + i.priceAtAdd * i.quantity, 0).toFixed(2));

    let discountTotal = 0;
    const couponCodes: string[] = [];
    for (const applied of cart.appliedCoupons) {
      const { discountApplied } = await this.couponsService.validateForCart(applied.code, subtotal, 0);
      discountTotal += discountApplied;
      couponCodes.push(applied.code);
    }
    discountTotal = Number(discountTotal.toFixed(2));

    // Each distinct product's shipping fee is charged once, regardless of quantity or variant.
    const productIds = [...new Set(cart.items.map((i) => String(i.productId)))];
    const products = await this.productModel
      .find({ _id: { $in: productIds } }, { 'fulfillment.shippingFee': 1, 'fulfillment.returnWindowDays': 1 })
      .lean()
      .exec();
    const returnWindowByProduct = new Map(
      products.map((p) => [String(p._id), p.fulfillment?.returnWindowDays ?? null]),
    );
    const shippingFee = Number(products.reduce((sum, p) => sum + (p.fulfillment?.shippingFee ?? 0), 0).toFixed(2));
    const total = Number((subtotal - discountTotal + shippingFee).toFixed(2));

    return {
      user,
      address,
      cart,
      returnWindowByProduct,
      breakdown: { subtotal, discountTotal, couponCodes, shippingFee, tax: 0, total, currency: CHECKOUT_CURRENCY },
    };
  }

  /** Step 1 of checkout: price the cart and hand the client a PaymentIntent to confirm. */
  async createCheckoutPayment(userId: string, addressId: string) {
    const { user, cart, breakdown } = await this.priceCart(userId, addressId);
    if (breakdown.total < MIN_CHARGE) {
      throw new BadRequestException(`Order total must be at least ${MIN_CHARGE.toFixed(2)} to pay by card`);
    }
    const customerId = await this.paymentsService.getOrCreateCustomerId(user as any);
    if (user.stripeCustomerId !== customerId) await this.usersService.setStripeCustomerId(userId, customerId);

    const intent = await this.paymentsService.upsertCheckoutIntent({
      existingId: cart.pendingPaymentIntentId,
      amount: breakdown.total,
      currency: breakdown.currency,
      customerId,
      userId,
      addressId,
    });
    if (cart.pendingPaymentIntentId !== intent.id) {
      await this.cartModel.updateOne({ _id: cart._id }, { $set: { pendingPaymentIntentId: intent.id } }).exec();
    }
    return {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      breakdown,
      itemCount: cart.items.reduce((n, i) => n + i.quantity, 0),
    };
  }

  /**
   * Step 2 of checkout: turn a *succeeded* PaymentIntent into a paid order. Idempotent per
   * intent — the client call and the Stripe webhook can both arrive and only one order results.
   */
  async placeOrder(userId: string, dto: CreateOrderDto) {
    // One placement per intent at a time: the client call and the webhook can arrive together,
    // and the loser must see the winner's order — not an emptied cart it would wrongly refund.
    const lockKey = `checkout-lock:${dto.paymentIntentId}`;
    for (let attempt = 0; ; attempt++) {
      const existing = await this.findOrderForIntent(userId, dto.paymentIntentId);
      if (existing) return { order: existing };
      if (await this.redis.set(lockKey, '1', 'EX', 60, 'NX')) break;
      if (attempt >= 20) throw new BadRequestException('Your order is still being placed — refresh in a moment');
      await new Promise((r) => setTimeout(r, 500));
    }
    try {
      const existing = await this.findOrderForIntent(userId, dto.paymentIntentId);
      if (existing) return { order: existing };
      return await this.placeOrderLocked(userId, dto);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  private async findOrderForIntent(userId: string, paymentIntentId: string) {
    const order = await this.ordersRepo.findOne({ where: { stripe_payment_intent: paymentIntentId }, relations: { items: true } });
    if (order && order.user_id !== userId) throw new ForbiddenException('Not your payment');
    return order;
  }

  private async placeOrderLocked(userId: string, dto: CreateOrderDto) {

    const intent = await this.paymentsService.retrievePaymentIntent(dto.paymentIntentId);
    if (intent.metadata?.userId !== userId || intent.metadata?.kind !== 'checkout') {
      throw new ForbiddenException('This payment does not belong to your checkout');
    }
    if (intent.status !== 'succeeded') {
      throw new BadRequestException(
        intent.status === 'processing'
          ? 'Your payment is still processing. We will confirm your order as soon as it completes.'
          : 'Payment has not been completed yet',
      );
    }

    let priced: Awaited<ReturnType<OrdersService['priceCart']>>;
    try {
      priced = await this.priceCart(userId, dto.addressId);
      if (Math.round(priced.breakdown.total * 100) !== intent.amount) {
        throw new BadRequestException('Your cart changed while you were paying');
      }
    } catch (err) {
      // The customer has been charged but we can't honour it (cart/stock/price changed):
      // give the money back straight away rather than leaving it in limbo.
      throw await this.refundUnfulfillable(intent.id, err);
    }
    const { address, cart, returnWindowByProduct, breakdown } = priced;

    let order: Order;
    try {
      order = await this.dataSource.transaction(async (manager) => {
        const savedOrder = await manager.save(
          manager.create(Order, {
            user_id: userId,
            status: 'paid',
            cancellable_until: new Date(Date.now() + CANCELLATION_WINDOW_MS),
            subtotal: breakdown.subtotal,
            discount_total: breakdown.discountTotal,
            coupon_codes: breakdown.couponCodes,
            tax: breakdown.tax,
            shipping_fee: breakdown.shippingFee,
            total: breakdown.total,
            currency: breakdown.currency,
            stripe_payment_intent: intent.id,
            shipping_address: address as unknown as Record<string, unknown>,
            shipping_phone: address.phone,
          }),
        );

        await this.inventoryService.decrementForOrder(
          manager,
          cart.items.map((i) => ({ sku: i.sku, quantity: i.quantity })),
        );

        const items = cart.items.map((i) =>
          manager.create(OrderItem, {
            order_id: savedOrder.id,
            product_id: i.productId,
            sku: i.sku,
            seller_id: '', // resolved below once inventory rows are fetched
            quantity: i.quantity,
            unit_price: i.priceAtAdd,
            subtotal: i.priceAtAdd * i.quantity,
            return_window_days: returnWindowByProduct.get(String(i.productId)) ?? null,
          }),
        );
        // seller_id per SKU comes from the inventory table (source of truth for ownership)
        for (const item of items) {
          const inv = await this.inventoryService.findBySku(item.sku);
          item.seller_id = inv?.seller_id ?? '';
        }
        await manager.save(items);
        savedOrder.items = items;

        await manager.save(
          manager.create(Payment, {
            order_id: savedOrder.id,
            stripe_payment_intent: intent.id,
            status: 'succeeded',
            amount: intent.amount / 100,
            currency: intent.currency.toUpperCase(),
          }),
        );
        return savedOrder;
      });
    } catch (err) {
      throw await this.refundUnfulfillable(intent.id, err);
    }

    await this.cartService.clear(cart._id);
    await this.notifications.enqueue({
      type: 'order-confirmation',
      to: userId,
      payload: { orderId: order.id, total: breakdown.total },
    });
    const sellerIds = [...new Set(order.items.map((i) => i.seller_id))];
    for (const sellerId of sellerIds) {
      await this.notifications.enqueue({ type: 'seller-new-order', to: sellerId, payload: { orderId: order.id } });
    }
    return { order };
  }

  /** Webhook backstop: completes checkout if the customer closed the tab after paying. */
  async fulfillCheckoutIntent(intent: { id: string; metadata?: Record<string, string> }) {
    const { userId, addressId } = intent.metadata ?? {};
    if (!userId || !addressId) return;
    try {
      await this.placeOrder(userId, { addressId, paymentIntentId: intent.id });
    } catch (err) {
      this.logger.warn(`Webhook could not place order for ${intent.id}: ${(err as Error).message}`);
    }
  }

  /** Refunds a charge we couldn't turn into an order and returns the error to surface. */
  private async refundUnfulfillable(paymentIntentId: string, cause: unknown): Promise<Error> {
    const reason = cause instanceof Error ? cause.message : 'Order could not be placed';
    try {
      await this.paymentsService.refund(paymentIntentId, reason);
    } catch (refundErr) {
      this.logger.error(`Refund failed for ${paymentIntentId}: ${(refundErr as Error).message}`);
      return new BadRequestException(`${reason}. We could not refund automatically — please contact support.`);
    }
    return new BadRequestException(`${reason}. Your payment has been refunded.`);
  }


  findForUser(userId: string, filter: { status?: string; from?: string; to?: string } = {}) {
    const qb = this.ordersRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .where('o.user_id = :userId', { userId });
    if (filter.status) qb.andWhere('o.status = :status', { status: filter.status });
    if (filter.from) qb.andWhere('o.created_at >= :from', { from: filter.from });
    if (filter.to) qb.andWhere('o.created_at <= :to', { to: filter.to });
    return qb.orderBy('o.created_at', 'DESC').getMany();
  }

  async findOneForUser(userId: string, orderId: string) {
    const order = await this.ordersRepo.findOne({ where: { id: orderId }, relations: { items: true } });
    if (!order || order.user_id !== userId) throw new NotFoundException('Order not found');
    return order;
  }

  findForSeller(sellerId: string, filter: { status?: string; from?: string; to?: string } = {}) {
    const qb = this.orderItemsRepo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.order', 'order')
      .where('item.seller_id = :sellerId', { sellerId });
    if (filter.status) qb.andWhere('order.status = :status', { status: filter.status });
    if (filter.from) qb.andWhere('order.created_at >= :from', { from: filter.from });
    if (filter.to) qb.andWhere('order.created_at <= :to', { to: filter.to });
    return qb.orderBy('order.created_at', 'DESC').getMany();
  }

  findAllForAdmin() {
    return this.ordersRepo.find({ relations: { items: true }, order: { created_at: 'DESC' } });
  }

  async cancelOwnOrder(userId: string, orderId: string) {
    const order = await this.findOneForUser(userId, orderId);
    if (order.status !== 'placed' && order.status !== 'paid') {
      throw new BadRequestException('Order can no longer be cancelled');
    }
    if (!order.cancellable_until || new Date() > order.cancellable_until) {
      throw new BadRequestException('Cancellation window has passed');
    }
    order.status = 'cancelled';
    await this.ordersRepo.save(order);
    // Restock is a follow-up write, not folded into the checkout transaction above.
    for (const item of order.items) {
      const inv = await this.inventoryService.findBySku(item.sku);
      if (inv) {
        await this.inventoryService.updateForSeller(inv.seller_id, item.sku, {
          quantity: inv.quantity + item.quantity,
        });
      }
    }
    return order;
  }

  async fulfillItem(
    sellerId: string,
    orderId: string,
    itemId: string,
    status: 'shipped' | 'delivered',
  ) {
    const item = await this.orderItemsRepo.findOne({
      where: { id: itemId, order_id: orderId },
      relations: { order: true },
    });
    if (!item) throw new NotFoundException('Order item not found');
    if (item.seller_id !== sellerId) throw new ForbiddenException('Not your order item');
    item.fulfillment_status = status;
    if (status === 'shipped' && !item.shipped_at) item.shipped_at = new Date();
    if (status === 'delivered') {
      item.shipped_at ??= new Date();
      item.delivered_at = new Date();
    }
    await this.orderItemsRepo.save(item);

    const allItems = await this.orderItemsRepo.find({ where: { order_id: orderId } });
    if (allItems.every((i) => i.fulfillment_status === 'delivered')) {
      await this.ordersRepo.update(orderId, { status: 'delivered' });
    } else if (allItems.every((i) => i.fulfillment_status !== 'pending')) {
      await this.ordersRepo.update(orderId, { status: 'shipped' });
    }
    return item;
  }

  async markPaid(orderId: string) {
    await this.ordersRepo.update(orderId, { status: 'paid' });
  }
}
