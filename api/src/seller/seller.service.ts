import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { DataSource, In, Repository } from 'typeorm';
import { Product, ProductDocument } from '../catalog/schemas/product.schema';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { ReturnRequest } from '../returns/entities/return-request.entity';
import { UsersService } from '../users/users.service';
import { BankAccountDto, CreatePayoutDto } from './dto/seller.dto';
import { SellerPayout } from './entities/seller-payout.entity';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Where a sold item's money currently sits from the seller's point of view:
 * - awaiting_payment / cancelled: never counted
 * - in_transit: paid but not yet delivered (in process)
 * - return_window / return_requested: delivered, held until the return window closes
 * - refunded: a return was approved, the sale is reversed
 * - settled: window closed, the amount is available to withdraw
 */
export type Settlement =
  | 'awaiting_payment'
  | 'cancelled'
  | 'in_transit'
  | 'return_window'
  | 'return_requested'
  | 'refunded'
  | 'settled';

const num = (v: unknown) => Number(v ?? 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

interface ProductInfo {
  title: string;
  image: string | null;
  basePrice: number;
  returnWindowDays: number | null;
  shippingFee: number;
}

@Injectable()
export class SellerService {
  constructor(
    @InjectRepository(OrderItem) private itemsRepo: Repository<OrderItem>,
    @InjectRepository(Order) private ordersRepo: Repository<Order>,
    @InjectRepository(ReturnRequest) private returnsRepo: Repository<ReturnRequest>,
    @InjectRepository(Payment) private paymentsRepo: Repository<Payment>,
    @InjectRepository(SellerPayout) private payoutsRepo: Repository<SellerPayout>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private usersService: UsersService,
    private dataSource: DataSource,
  ) {}

  // ---------- shared loading ----------

  private async loadSellerItems(sellerId: string, orderId?: string) {
    const items = await this.itemsRepo.find({
      where: { seller_id: sellerId, ...(orderId ? { order_id: orderId } : {}) },
      relations: { order: true },
      order: { order: { created_at: 'DESC' } },
    });
    const itemIds = items.map((i) => i.id);
    const returns = itemIds.length
      ? await this.returnsRepo.find({ where: { order_item_id: In(itemIds) }, order: { created_at: 'DESC' } })
      : [];
    // Latest request wins if a customer filed more than one.
    const returnByItem = new Map<string, ReturnRequest>();
    for (const r of returns) if (!returnByItem.has(r.order_item_id)) returnByItem.set(r.order_item_id, r);

    const productIds = [...new Set(items.map((i) => i.product_id))];
    const products = await this.productModel
      .find({ _id: { $in: productIds } }, { title: 1, images: 1, pricing: 1, fulfillment: 1, variants: 1 })
      .lean()
      .exec();
    const productById = new Map<string, ProductInfo>();
    const imageBySku = new Map<string, string>();
    for (const p of products) {
      productById.set(String(p._id), {
        title: p.title,
        image: p.images?.main || null,
        basePrice: p.pricing?.basePrice ?? 0,
        returnWindowDays: p.fulfillment?.returnWindowDays ?? null,
        shippingFee: p.fulfillment?.shippingFee ?? 0,
      });
      for (const v of p.variants ?? []) if (v.images?.[0]) imageBySku.set(v.sku, v.images[0]);
    }
    return { items, returnByItem, productById, imageBySku };
  }

  private settle(item: OrderItem, ret: ReturnRequest | undefined, product: ProductInfo | undefined, now = new Date()) {
    const order = item.order;
    const windowDays = item.return_window_days ?? product?.returnWindowDays ?? 0;
    const deliveredAt = item.fulfillment_status === 'delivered' ? (item.delivered_at ?? order.updated_at) : null;
    const releaseAt = deliveredAt ? new Date(new Date(deliveredAt).getTime() + windowDays * DAY_MS) : null;

    let status: Settlement;
    if (order.status === 'cancelled') status = 'cancelled';
    else if (order.status === 'placed') status = 'awaiting_payment';
    else if (ret && (ret.status === 'approved' || ret.status === 'completed')) status = 'refunded';
    else if (ret && ret.status === 'requested') status = 'return_requested';
    else if (!deliveredAt) status = 'in_transit';
    else if (releaseAt && now < releaseAt) status = 'return_window';
    else status = 'settled';

    return { status, deliveredAt, releaseAt, windowDays };
  }

  private shapeItem(
    item: OrderItem,
    ctx: Awaited<ReturnType<SellerService['loadSellerItems']>>,
  ) {
    const product = ctx.productById.get(item.product_id);
    const ret = ctx.returnByItem.get(item.id);
    const settlement = this.settle(item, ret, product);
    const unitPrice = num(item.unit_price);
    const mrp = Math.max(product?.basePrice ?? unitPrice, unitPrice);
    return {
      id: item.id,
      productId: item.product_id,
      sku: item.sku,
      title: product?.title ?? item.sku,
      image: ctx.imageBySku.get(item.sku) ?? product?.image ?? null,
      quantity: item.quantity,
      unitPrice,
      mrp,
      productDiscount: round2((mrp - unitPrice) * item.quantity),
      subtotal: num(item.subtotal),
      fulfillmentStatus: item.fulfillment_status,
      shippedAt: item.shipped_at,
      deliveredAt: settlement.deliveredAt,
      returnWindowDays: settlement.windowDays,
      returnWindowEndsAt: settlement.releaseAt,
      settlement: settlement.status,
      returnRequest: ret
        ? { id: ret.id, reason: ret.reason, status: ret.status, createdAt: ret.created_at, updatedAt: ret.updated_at }
        : null,
    };
  }

  // ---------- orders ----------

  /** Seller's orders grouped per order (a customer order can contain several of their items). */
  async listOrders(sellerId: string, status?: string) {
    const ctx = await this.loadSellerItems(sellerId);
    const groups = new Map<string, { order: Order; items: ReturnType<SellerService['shapeItem']>[] }>();
    for (const item of ctx.items) {
      if (status && item.order.status !== status) continue;
      const g = groups.get(item.order_id) ?? { order: item.order, items: [] };
      g.items.push(this.shapeItem(item, ctx));
      groups.set(item.order_id, g);
    }
    return [...groups.values()].map(({ order, items }) => ({
      id: order.id,
      status: order.status,
      createdAt: order.created_at,
      currency: order.currency,
      itemCount: items.reduce((n, i) => n + i.quantity, 0),
      sellerSubtotal: round2(items.reduce((sum, i) => sum + i.subtotal, 0)),
      hasReturn: items.some((i) => i.returnRequest),
      returnStatus: items.find((i) => i.returnRequest)?.returnRequest?.status ?? null,
      items,
    }));
  }

  async getOrder(sellerId: string, orderId: string) {
    const ctx = await this.loadSellerItems(sellerId, orderId);
    if (ctx.items.length === 0) throw new NotFoundException('Order not found');
    const order = ctx.items[0].order;
    const items = ctx.items.map((i) => this.shapeItem(i, ctx));

    const orderSubtotal = num(order.subtotal);
    const sellerSubtotal = round2(items.reduce((s, i) => s + i.subtotal, 0));
    const mrpTotal = round2(items.reduce((s, i) => s + i.mrp * i.quantity, 0));
    // Coupons apply to the whole order; attribute them to this seller pro rata by subtotal.
    const share = orderSubtotal > 0 ? sellerSubtotal / orderSubtotal : 0;
    const couponShare = round2(num(order.discount_total) * share);
    const shippingShare = round2(
      [...new Set(items.map((i) => i.productId))].reduce(
        (s, id) => s + (ctx.productById.get(id)?.shippingFee ?? 0),
        0,
      ),
    );
    const refunded = round2(items.filter((i) => i.settlement === 'refunded').reduce((s, i) => s + i.subtotal, 0));

    const customer = await this.usersService.findById(order.user_id);
    const payment = await this.paymentsRepo.findOne({ where: { order_id: order.id }, order: { created_at: 'DESC' } });
    const paid = order.status !== 'placed' && order.status !== 'cancelled';

    return {
      id: order.id,
      status: order.status,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      cancellableUntil: order.cancellable_until,
      currency: order.currency,
      customer: { name: customer?.name ?? 'Customer' },
      shippingAddress: order.shipping_address,
      shippingPhone: order.shipping_phone,
      items,
      breakdown: {
        mrpTotal,
        productDiscount: round2(mrpTotal - sellerSubtotal),
        sellerSubtotal,
        couponCodes: order.coupon_codes,
        couponDiscount: couponShare,
        shipping: shippingShare,
        tax: round2(num(order.tax) * share),
        customerPaid: round2(sellerSubtotal - couponShare + shippingShare + num(order.tax) * share),
        refunded,
        // Coupons are platform-funded, so the seller earns the item subtotal less refunds.
        sellerEarnings: round2(sellerSubtotal - refunded),
      },
      orderTotals: {
        subtotal: orderSubtotal,
        discount: num(order.discount_total),
        shipping: num(order.shipping_fee),
        tax: num(order.tax),
        total: num(order.total),
        otherSellersItems: orderSubtotal - sellerSubtotal > 0.009,
      },
      payment: {
        status: payment?.status ?? (paid ? 'succeeded' : order.status === 'cancelled' ? 'cancelled' : 'requires_payment'),
        method: 'Card (Stripe)',
        amount: payment ? num(payment.amount) : num(order.total),
        currency: payment?.currency ?? order.currency,
        reference: payment?.stripe_payment_intent ?? order.stripe_payment_intent,
        paidAt: payment?.created_at ?? (paid ? order.updated_at : null),
      },
    };
  }

  // ---------- finance ----------

  async getFinance(sellerId: string) {
    const ctx = await this.loadSellerItems(sellerId);
    const payouts = await this.payoutsRepo.find({ where: { seller_id: sellerId }, order: { created_at: 'DESC' } });

    const wallet = { inTransit: 0, onHold: 0, settled: 0, refunded: 0, paidOut: 0 };
    const transactions: {
      id: string;
      type: 'sale' | 'refund' | 'payout';
      direction: 'in' | 'out';
      amount: number;
      date: Date;
      status: string;
      description: string;
      orderId?: string;
      sku?: string;
      productId?: string;
      image?: string | null;
      availableOn?: Date | null;
      reference?: string;
    }[] = [];

    for (const raw of ctx.items) {
      const item = this.shapeItem(raw, ctx);
      if (item.settlement === 'awaiting_payment' || item.settlement === 'cancelled') continue;
      const amount = item.subtotal;
      if (item.settlement === 'in_transit') wallet.inTransit += amount;
      else if (item.settlement === 'return_window' || item.settlement === 'return_requested') wallet.onHold += amount;
      else if (item.settlement === 'settled') wallet.settled += amount;

      transactions.push({
        id: `sale-${item.id}`,
        type: 'sale',
        direction: 'in',
        amount,
        date: raw.order.created_at,
        status: item.settlement,
        description: `${item.title} × ${item.quantity}`,
        orderId: raw.order_id,
        sku: item.sku,
        productId: item.productId,
        image: item.image,
        availableOn: item.settlement === 'in_transit' ? null : item.returnWindowEndsAt,
      });
      if (item.settlement === 'refunded' && item.returnRequest) {
        wallet.refunded += amount;
        transactions.push({
          id: `refund-${item.returnRequest.id}`,
          type: 'refund',
          direction: 'out',
          amount,
          date: item.returnRequest.updatedAt,
          status: item.returnRequest.status,
          description: `Refund · ${item.title}`,
          orderId: raw.order_id,
          sku: item.sku,
          productId: item.productId,
          image: item.image,
        });
      }
    }

    for (const p of payouts) {
      if (p.status !== 'failed') wallet.paidOut += num(p.amount);
      transactions.push({
        id: `payout-${p.id}`,
        type: 'payout',
        direction: 'out',
        amount: num(p.amount),
        date: p.created_at,
        status: p.status,
        description: `Transfer to ${p.destination}`,
        reference: p.reference,
      });
    }

    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const seller = await this.usersService.findById(sellerId);
    const bank = seller?.sellerProfile?.payoutDetails ?? null;

    return {
      wallet: {
        inProcess: round2(wallet.inTransit),
        onHold: round2(wallet.onHold),
        available: round2(Math.max(0, wallet.settled - wallet.paidOut)),
        lifetimeEarnings: round2(wallet.inTransit + wallet.onHold + wallet.settled),
        totalRefunded: round2(wallet.refunded),
        totalPaidOut: round2(wallet.paidOut),
      },
      bankAccount: bank?.accountLast4 ? bank : null,
      transactions,
    };
  }

  async createPayout(sellerId: string, dto: CreatePayoutDto) {
    const seller = await this.usersService.findById(sellerId);
    const bank = seller?.sellerProfile?.payoutDetails;
    if (!bank?.accountLast4) throw new BadRequestException('Add a bank account before withdrawing');

    // Serialize payouts per seller so two concurrent requests can't both spend the same balance.
    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [sellerId]);
      const { wallet } = await this.getFinance(sellerId);
      const amount = round2(dto.amount ?? wallet.available);
      if (amount < 1) throw new BadRequestException('No settled balance available to withdraw');
      if (amount > wallet.available) {
        throw new BadRequestException(`You can withdraw up to ₹${wallet.available.toFixed(2)}`);
      }
      // No payout provider is wired up yet, so the transfer is recorded as completed immediately.
      const payout = manager.create(SellerPayout, {
        seller_id: sellerId,
        amount,
        status: 'paid',
        reference: `UTR${randomBytes(6).toString('hex').toUpperCase()}`,
        destination: `${bank.bankName ?? 'Bank'} ••${bank.accountLast4}`,
        processed_at: new Date(),
      });
      return manager.save(payout);
    });
  }

  setBankAccount(sellerId: string, dto: BankAccountDto) {
    return this.usersService.setPayoutDetails(sellerId, {
      bankAccountRef: `ba_${randomBytes(8).toString('hex')}`,
      accountHolderName: dto.accountHolderName.trim(),
      bankName: dto.bankName.trim(),
      ifsc: dto.ifsc,
      accountLast4: dto.accountNumber.slice(-4),
    });
  }
}
