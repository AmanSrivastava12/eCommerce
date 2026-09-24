/* eslint-disable no-console */
import 'dotenv/config';
import mongoose from 'mongoose';
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

const UserModel = mongoose.model(User.name, UserSchema);
const ProductModel = mongoose.model(Product.name, ProductSchema);
const CategoryModel = mongoose.model(Category.name, CategorySchema);
const SaleModel = mongoose.model(Sale.name, SaleSchema);
const CouponModel = mongoose.model(Coupon.name, CouponSchema);
const ReviewModel = mongoose.model(Review.name, ReviewSchema);

/**
 * Deletes ONLY documents/rows explicitly flagged `isSeedData` / `is_seed_data` — set exclusively
 * by seed/seed.ts. Never runs a blanket delete on any collection or table, so real data (a real
 * signup, a real order, a manually-created category, etc.) is left untouched even if it sits
 * right next to seeded rows with no other distinguishing feature.
 */
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
    console.log('\nRemoving seeded Postgres rows (FK-safe order)...');

    // Return requests reference order_items; delete first.
    const returnRepo = dataSource.getRepository(ReturnRequest);
    const seedReturnIds = (await returnRepo.find({ where: { is_seed_data: true }, select: { id: true } })).map(
      (r) => r.id,
    );
    if (seedReturnIds.length > 0) await returnRepo.delete(seedReturnIds);
    console.log(`  return_requests: ${seedReturnIds.length} removed`);

    const paymentRepo = dataSource.getRepository(Payment);
    const seedPaymentIds = (await paymentRepo.find({ where: { is_seed_data: true }, select: { id: true } })).map(
      (p) => p.id,
    );
    if (seedPaymentIds.length > 0) await paymentRepo.delete(seedPaymentIds);
    console.log(`  payments: ${seedPaymentIds.length} removed`);

    const orderItemRepo = dataSource.getRepository(OrderItem);
    const seedOrderItemIds = (await orderItemRepo.find({ where: { is_seed_data: true }, select: { id: true } })).map(
      (i) => i.id,
    );
    if (seedOrderItemIds.length > 0) await orderItemRepo.delete(seedOrderItemIds);
    console.log(`  order_items: ${seedOrderItemIds.length} removed`);

    const orderRepo = dataSource.getRepository(Order);
    const seedOrderIds = (await orderRepo.find({ where: { is_seed_data: true }, select: { id: true } })).map(
      (o) => o.id,
    );
    if (seedOrderIds.length > 0) await orderRepo.delete(seedOrderIds);
    console.log(`  orders: ${seedOrderIds.length} removed`);

    const inventoryRepo = dataSource.getRepository(InventoryItem);
    const seedSkus = (await inventoryRepo.find({ where: { is_seed_data: true }, select: { sku: true } })).map(
      (i) => i.sku,
    );
    if (seedSkus.length > 0) await inventoryRepo.delete(seedSkus);
    console.log(`  inventory: ${seedSkus.length} removed`);

    console.log('\nRemoving seeded MongoDB documents...');
    const reviews = await ReviewModel.deleteMany({ isSeedData: true });
    console.log(`  reviews: ${reviews.deletedCount ?? 0} removed`);

    const products = await ProductModel.deleteMany({ isSeedData: true });
    console.log(`  products: ${products.deletedCount ?? 0} removed`);

    const coupons = await CouponModel.deleteMany({ isSeedData: true });
    console.log(`  coupons: ${coupons.deletedCount ?? 0} removed`);

    const sales = await SaleModel.deleteMany({ isSeedData: true });
    console.log(`  sales: ${sales.deletedCount ?? 0} removed`);

    const categories = await CategoryModel.deleteMany({ isSeedData: true });
    console.log(`  categories: ${categories.deletedCount ?? 0} removed`);

    const users = await UserModel.deleteMany({ isSeedData: true });
    console.log(`  users: ${users.deletedCount ?? 0} removed`);

    console.log('\nDone. Anything not flagged as seed data (real signups, real orders, etc.) was left untouched.');
  } finally {
    await dataSource.destroy();
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Unseed failed:', err);
  process.exit(1);
});
