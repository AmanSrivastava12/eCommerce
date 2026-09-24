/* eslint-disable no-console */
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import { DataSource } from 'typeorm';

import { User, UserSchema } from '../src/users/schemas/user.schema';
import { Product, ProductSchema } from '../src/catalog/schemas/product.schema';
import { Category, CategorySchema } from '../src/catalog/schemas/category.schema';
import { Sale, SaleSchema } from '../src/sales/schemas/sale.schema';
import { Coupon, CouponSchema } from '../src/coupons/schemas/coupon.schema';
import { Review, ReviewSchema } from '../src/reviews/schemas/review.schema';
import { InventoryItem } from '../src/inventory/entities/inventory.entity';
import { Order } from '../src/orders/entities/order.entity';
import { OrderItem } from '../src/orders/entities/order-item.entity';
import { Payment } from '../src/payments/entities/payment.entity';
import { ReturnRequest } from '../src/returns/entities/return-request.entity';

import categoriesData from './data/categories.json';
import usersData from './data/users.json';
import productsData from './data/products.json';
import salesData from './data/sales.json';
import couponsData from './data/coupons.json';

const UserModel = mongoose.model(User.name, UserSchema);
const ProductModel = mongoose.model(Product.name, ProductSchema);
const CategoryModel = mongoose.model(Category.name, CategorySchema);
const SaleModel = mongoose.model(Sale.name, SaleSchema);
const CouponModel = mongoose.model(Coupon.name, CouponSchema);
const ReviewModel = mongoose.model(Review.name, ReviewSchema);

// --- small deterministic-ish RNG helpers (seeded so reruns after `unseed` look the same) ---
let seedState = 42;
function rand(): number {
  seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
  return seedState / 0x7fffffff;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
  }
  return out;
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const REVIEW_TEMPLATES: { rating: number; title: string; comment: string }[] = [
  { rating: 5, title: 'Exceeded expectations', comment: 'Exactly as described and arrived faster than I expected. Would buy again.' },
  { rating: 5, title: 'Excellent quality', comment: 'The build quality is fantastic for the price. Very happy with this purchase.' },
  { rating: 4, title: 'Really good, minor niggles', comment: 'Does what it promises. Packaging could be a bit sturdier but the product itself is solid.' },
  { rating: 4, title: 'Great value', comment: "Works well and looks great. Docked one star only because delivery took a couple of extra days." },
  { rating: 3, title: 'Decent, does the job', comment: "It's fine — nothing special but nothing wrong either. Matches the description." },
  { rating: 5, title: 'Highly recommend', comment: 'Second time ordering this. Consistent quality and reliable seller.' },
  { rating: 2, title: 'Expected better', comment: 'Quality feels a bit below what the photos suggest. Usable but underwhelming.' },
  { rating: 4, title: 'Good purchase', comment: 'Solid product for daily use. Would consider other items from this seller.' },
];

const RETURN_REASONS = ['Wrong size', 'Changed my mind', 'Item arrived damaged', 'Not as described', 'Found a better price elsewhere'];

async function main() {
  const mongoUri = process.env.MONGO_URI;
  const postgresUrl = process.env.POSTGRES_URL;
  if (!mongoUri || !postgresUrl) {
    throw new Error('MONGO_URI and POSTGRES_URL must be set (copy .env.example to .env first)');
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);

  console.log('Connecting to PostgreSQL...');
  const dataSource = new DataSource({
    type: 'postgres',
    url: postgresUrl,
    entities: [InventoryItem, Order, OrderItem, Payment, ReturnRequest],
    synchronize: false,
  });
  await dataSource.initialize();

  try {
    const orderRepo = dataSource.getRepository(Order);
    const orderItemRepo = dataSource.getRepository(OrderItem);
    const returnRepo = dataSource.getRepository(ReturnRequest);
    const inventoryRepo = dataSource.getRepository(InventoryItem);

    const existingSeedOrders = await orderRepo.count({ where: { is_seed_data: true } });
    if (existingSeedOrders > 0) {
      console.log(
        `\nFound ${existingSeedOrders} existing seed orders — skipping order/review generation to avoid duplicates.`,
      );
      console.log('Run "npm run unseed" first if you want a completely fresh dataset.\n');
    }
    const shouldGenerateOrders = existingSeedOrders === 0;

    console.log('Seeding categories...');
    const categoryIdBySlug = new Map<string, Types.ObjectId>();
    for (const cat of categoriesData as (typeof categoriesData[number] & { parentSlug?: string })[]) {
      const { parentSlug, ...rest } = cat;
      const parentId = parentSlug ? categoryIdBySlug.get(parentSlug) ?? null : null;
      const doc = await CategoryModel.findOneAndUpdate(
        { slug: cat.slug },
        { $set: { ...rest, parentId, isSeedData: true } },
        { upsert: true, returnDocument: 'after' },
      );
      categoryIdBySlug.set(cat.slug, doc._id as Types.ObjectId);
    }
    const subcategoryCount = (categoriesData as { parentSlug?: string }[]).filter((c) => c.parentSlug).length;
    console.log(`  ${categoryIdBySlug.size} categories ready (${subcategoryCount} subcategories).`);

    console.log('Seeding users...');
    const passwordHash = await bcrypt.hash(usersData.admin.password, 10);
    await UserModel.findOneAndUpdate(
      { email: usersData.admin.email },
      {
        $setOnInsert: {
          email: usersData.admin.email,
          passwordHash,
          name: usersData.admin.name,
          role: usersData.admin.role,
        },
        $set: { isSeedData: true },
      },
      { upsert: true },
    );

    const sellerIds: Types.ObjectId[] = [];
    for (const seller of usersData.sellers) {
      const hash = await bcrypt.hash(seller.password, 10);
      const doc = await UserModel.findOneAndUpdate(
        { email: seller.email },
        {
          $setOnInsert: {
            email: seller.email,
            passwordHash: hash,
            name: seller.name,
            role: seller.role,
            sellerProfile: {
              businessName: seller.businessName,
              verificationStatus: 'verified',
              verifiedAt: new Date(),
              ratingSummary: {
                overall: { average: 0, count: 0 },
                productQuality: { average: 0, count: 0 },
                deliveryTimeliness: { average: 0, count: 0 },
                packaging: { average: 0, count: 0 },
              },
            },
          },
          $set: { isSeedData: true },
        },
        { upsert: true, returnDocument: 'after' },
      );
      sellerIds.push(doc._id as Types.ObjectId);
    }

    const customerIds: Types.ObjectId[] = [];
    for (const customer of usersData.customers as any[]) {
      const hash = await bcrypt.hash(customer.password, 10);
      const doc = await UserModel.findOneAndUpdate(
        { email: customer.email },
        {
          $setOnInsert: {
            email: customer.email,
            passwordHash: hash,
            name: customer.name,
            role: customer.role,
            phone: customer.phone,
            dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth) : undefined,
            gender: customer.gender,
            addresses: customer.addresses,
          },
          $set: { isSeedData: true },
        },
        { upsert: true, returnDocument: 'after' },
      );
      customerIds.push(doc._id as Types.ObjectId);
    }
    console.log(`  1 admin, ${sellerIds.length} sellers, ${customerIds.length} customers ready.`);

    console.log('Seeding sales...');
    const saleIdBySlug = new Map<string, Types.ObjectId>();
    for (const sale of salesData) {
      const doc = await SaleModel.findOneAndUpdate(
        { slug: sale.slug },
        { $set: { name: sale.name, startAt: new Date(sale.startAt), endAt: new Date(sale.endAt), isSeedData: true } },
        { upsert: true, returnDocument: 'after' },
      );
      saleIdBySlug.set(sale.slug, doc._id as Types.ObjectId);
    }

    console.log('Seeding coupons...');
    const coupons: { code: string; discountType: string; discountValue: number; minCartValue: number | null }[] = [];
    for (const coupon of couponsData as any[]) {
      await CouponModel.findOneAndUpdate(
        { code: coupon.code },
        {
          $set: {
            ...coupon,
            validFrom: new Date(coupon.validFrom),
            validTo: new Date(coupon.validTo),
            isSeedData: true,
          },
        },
        { upsert: true },
      );
      if (coupon.active && new Date(coupon.validTo) > new Date()) coupons.push(coupon);
    }

    console.log('Seeding products, variants, and inventory...');
    const createdProducts: (Product & { _id: Types.ObjectId })[] = [];

    for (const p of productsData as any[]) {
      const categoryId = categoryIdBySlug.get(p.categorySlug);
      const sellerId = sellerIds[p.sellerIndex];
      if (!categoryId || !sellerId) {
        console.warn(`  Skipping "${p.title}" — missing category or seller reference.`);
        continue;
      }

      const pricing = { ...p.pricing };
      if (p.pricing.activeSaleSlug) {
        pricing.activeSaleId = saleIdBySlug.get(p.pricing.activeSaleSlug) ?? null;
        delete pricing.activeSaleSlug;
      }

      const doc = await ProductModel.findOneAndUpdate(
        { title: p.title, sellerId },
        {
          $set: {
            title: p.title,
            sellerId,
            categoryId,
            description: p.description,
            faqs: p.faqs,
            images: p.images,
            pricing,
            variants: p.variants.map(({ initialQuantity, ...v }: any) => v),
            fulfillment: p.fulfillment,
            status: p.status,
            isSeedData: true,
          },
        },
        { upsert: true, returnDocument: 'after' },
      );
      createdProducts.push(doc as any);

      for (const variant of p.variants) {
        await inventoryRepo.upsert(
          {
            sku: variant.sku,
            product_id: String(doc._id),
            seller_id: String(sellerId),
            quantity: variant.initialQuantity,
            reserved_qty: 0,
            low_stock_threshold: 5,
            is_seed_data: true,
          },
          ['sku'],
        );
      }
    }
    console.log(`  ${createdProducts.length} products ready.`);

    if (!shouldGenerateOrders) {
      console.log('\nSeed complete (categories/users/products/coupons refreshed; orders/reviews left untouched).');
      printCredentials();
      return;
    }

    console.log('Generating diversified order history, reviews, and a few return requests...');
    const ORDER_STATUSES: Array<'placed' | 'paid' | 'shipped' | 'delivered' | 'cancelled'> = [
      'delivered', 'delivered', 'delivered', 'shipped', 'paid', 'placed', 'cancelled',
    ];

    const allReviews: { productId: Types.ObjectId; sku: string; userId: Types.ObjectId }[] = [];
    let totalOrders = 0;
    let totalReturns = 0;

    function addressFor(ci: number) {
      const addresses = (usersData.customers[ci] as any).addresses ?? [];
      const shippingAddress = addresses[0] ?? {
        label: 'Home', line1: '1 Seed Street', city: 'Seed City', country: 'India',
      };
      const shippingPhone = (usersData.customers[ci] as any).phone ?? '+91-9000000000';
      return { shippingAddress, shippingPhone };
    }

    /** Creates one order for customer index `ci`. If `forceProducts`/`forceStatus` are given
     * they're used verbatim (used to guarantee every product gets enough delivered orders for
     * a healthy spread of reviews); otherwise both are randomized for general order-history
     * diversity. */
    async function createOrder(
      ci: number,
      opts: { forceProducts?: (Product & { _id: Types.ObjectId })[]; forceStatus?: (typeof ORDER_STATUSES)[number] } = {},
    ) {
      const customerId = customerIds[ci];
      const { shippingAddress, shippingPhone } = addressFor(ci);

      const chosenProducts = opts.forceProducts ?? pickN(createdProducts, randInt(1, 3));
      const status = opts.forceStatus ?? pick(ORDER_STATUSES);
      const placedDaysAgo = randInt(1, 75);
      const createdAt = daysAgo(placedDaysAgo);

      let subtotal = 0;
      const itemsToCreate: {
        product: Product & { _id: Types.ObjectId };
        sku: string;
        quantity: number;
        unitPrice: number;
      }[] = [];
      for (const product of chosenProducts) {
        const variant = pick(product.variants as any[]);
        const unitPrice = variant.priceOverride ?? (product.pricing as any).basePrice;
        const quantity = randInt(1, 2);
        subtotal += unitPrice * quantity;
        itemsToCreate.push({ product, sku: variant.sku, quantity, unitPrice });
      }

      const applyCoupon = coupons.length > 0 && rand() < 0.3;
      const coupon = applyCoupon ? coupons.find((c) => (c.minCartValue ?? 0) <= subtotal) : undefined;
      const discountTotal = coupon
        ? coupon.discountType === 'percent'
          ? Number(((subtotal * coupon.discountValue) / 100).toFixed(2))
          : coupon.discountValue
        : 0;
      const shippingFee = subtotal >= 50 ? 0 : 4.99;
      const total = Number((subtotal - discountTotal + shippingFee).toFixed(2));

      const order = await orderRepo.save(
        orderRepo.create({
          user_id: String(customerId),
          status,
          cancellable_until: status === 'placed' ? daysAgo(placedDaysAgo - 1) : null,
          subtotal: Number(subtotal.toFixed(2)),
          discount_total: discountTotal,
          coupon_codes: coupon ? [coupon.code] : [],
          tax: 0,
          shipping_fee: shippingFee,
          total,
          currency: 'USD',
          shipping_address: shippingAddress,
          shipping_phone: shippingPhone,
          created_at: createdAt,
          updated_at: createdAt,
          is_seed_data: true,
        }),
      );

      const deliveredAt = status === 'delivered' ? daysAgo(Math.max(placedDaysAgo - randInt(2, 5), 0)) : null;
      const shippedAt = status === 'delivered' || status === 'shipped' ? daysAgo(Math.max(placedDaysAgo - 1, 0)) : null;
      const fulfillmentStatus = status === 'delivered' ? 'delivered' : status === 'shipped' ? 'shipped' : 'pending';

      const savedItems = [];
      for (const item of itemsToCreate) {
        const savedItem = await orderItemRepo.save(
          orderItemRepo.create({
            order_id: order.id,
            product_id: String(item.product._id),
            sku: item.sku,
            seller_id: String(item.product.sellerId),
            quantity: item.quantity,
            unit_price: item.unitPrice,
            subtotal: Number((item.unitPrice * item.quantity).toFixed(2)),
            fulfillment_status: fulfillmentStatus,
            shipped_at: shippedAt,
            delivered_at: deliveredAt,
            return_window_days: (item.product.fulfillment as any).returnWindowDays ?? null,
            is_seed_data: true,
          }),
        );
        savedItems.push({ savedItem, product: item.product, sku: item.sku });
      }

      if (status !== 'placed' && status !== 'cancelled') {
        await dataSource.getRepository(Payment).save(
          dataSource.getRepository(Payment).create({
            order_id: order.id,
            stripe_payment_intent: `pi_seed_${order.id.slice(0, 8)}`,
            status: 'succeeded',
            amount: total,
            currency: 'USD',
            is_seed_data: true,
          }),
        );
      }

      totalOrders++;

      // Delivered items are eligible for a review, and occasionally for a return request too.
      if (status === 'delivered') {
        for (const { savedItem, product, sku } of savedItems) {
          allReviews.push({ productId: product._id, sku, userId: customerId });

          if (rand() < 0.12) {
            await returnRepo.save(
              returnRepo.create({
                order_item_id: savedItem.id,
                requested_by: String(customerId),
                reason: pick(RETURN_REASONS),
                status: pick(['requested', 'approved', 'rejected', 'completed'] as const),
                is_seed_data: true,
              }),
            );
            totalReturns++;
          }
        }
      }
    }

    // Pass 1 — guarantee every product has enough delivered orders (from distinct customers)
    // to end up with a healthy 3-5 reviews each, rather than leaving that to chance.
    for (const product of createdProducts) {
      const reviewers = pickN(
        Array.from({ length: customerIds.length }, (_, i) => i),
        randInt(4, 6),
      );
      for (const ci of reviewers) {
        await createOrder(ci, { forceProducts: [product], forceStatus: 'delivered' });
      }
    }

    // Pass 2 — every customer explicitly gets one order in each non-delivered status (so the
    // orders list/detail pages have real placed/paid/shipped/cancelled examples to test for
    // *every* customer, not just as a lucky aggregate spread), plus a couple of extra random
    // orders (any status, including more delivered ones) for general history depth.
    const NON_DELIVERED_STATUSES: Array<'placed' | 'paid' | 'shipped' | 'cancelled'> = [
      'placed', 'paid', 'shipped', 'cancelled',
    ];
    for (let ci = 0; ci < customerIds.length; ci++) {
      for (const status of NON_DELIVERED_STATUSES) {
        await createOrder(ci, { forceStatus: status });
      }
      const extraOrders = randInt(1, 3);
      for (let oi = 0; oi < extraOrders; oi++) {
        await createOrder(ci);
      }
    }

    console.log(`  ${totalOrders} orders generated across ${customerIds.length} customers.`);
    console.log(`  ${totalReturns} return requests generated.`);

    console.log('Seeding reviews from delivered order items...');
    // Cap at ~5 reviews per product from distinct customers, sourced from the delivered items
    // generated above so every review has a real backing order.
    const reviewsByProduct = new Map<string, typeof allReviews>();
    for (const r of allReviews) {
      const key = String(r.productId);
      reviewsByProduct.set(key, [...(reviewsByProduct.get(key) ?? []), r]);
    }

    let reviewCount = 0;
    for (const [, candidates] of reviewsByProduct) {
      const seenCustomers = new Set<string>();
      const unique = candidates.filter((c) => {
        const key = String(c.userId);
        if (seenCustomers.has(key)) return false;
        seenCustomers.add(key);
        return true;
      });
      const chosen = pickN(unique, Math.min(unique.length, randInt(3, 5)));
      for (const c of chosen) {
        const template = pick(REVIEW_TEMPLATES);
        await ReviewModel.findOneAndUpdate(
          { productId: c.productId, sku: c.sku, userId: c.userId },
          {
            $set: {
              rating: template.rating,
              deliveryRating: randInt(3, 5),
              packagingRating: randInt(3, 5),
              title: template.title,
              comment: template.comment,
              images: [],
              isSeedData: true,
            },
          },
          { upsert: true },
        );
        reviewCount++;
      }
    }
    console.log(`  ${reviewCount} reviews ready.`);

    console.log('Recalculating product and seller rating summaries...');
    for (const product of createdProducts) {
      const reviews = await ReviewModel.find({ productId: product._id });
      const avg = average(reviews.map((rv) => rv.rating));
      await ProductModel.updateOne(
        { _id: product._id },
        { $set: { ratingSummary: { average: avg, count: reviews.length } } },
      );
    }
    for (const sellerId of sellerIds) {
      const sellerProductIds = await ProductModel.find({ sellerId }).distinct('_id');
      const reviews = await ReviewModel.find({ productId: { $in: sellerProductIds } });
      const overall = average(reviews.map((rv) => rv.rating));
      const delivery = average(reviews.filter((rv) => rv.deliveryRating != null).map((rv) => rv.deliveryRating as number));
      const packaging = average(reviews.filter((rv) => rv.packagingRating != null).map((rv) => rv.packagingRating as number));
      await UserModel.updateOne(
        { _id: sellerId },
        {
          $set: {
            'sellerProfile.ratingSummary': {
              overall: { average: overall, count: reviews.length },
              productQuality: { average: overall, count: reviews.length },
              deliveryTimeliness: {
                average: delivery,
                count: reviews.filter((rv) => rv.deliveryRating != null).length,
              },
              packaging: {
                average: packaging,
                count: reviews.filter((rv) => rv.packagingRating != null).length,
              },
            },
          },
        },
      );
    }

    console.log('\nSeed complete.');
    printCredentials();
  } finally {
    await dataSource.destroy();
    await mongoose.disconnect();
  }
}

function printCredentials() {
  console.log('\nSign in with:');
  console.log(`  Admin:    ${usersData.admin.email} / ${usersData.admin.password}`);
  usersData.sellers.forEach((s) => console.log(`  Seller:   ${s.email} / ${s.password}`));
  usersData.customers.forEach((c: any) => console.log(`  Customer: ${c.email} / ${c.password}`));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
