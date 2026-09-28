/**
 * One-off helper: creates the Postgres tables via TypeORM `synchronize: true` without
 * going through a full Nest build/boot. Useful in dev when you can't run `npm run
 * start:dev` (e.g. a stale root-owned dist/ from a previous run blocking the build).
 * Run once, then use `npm run seed` as normal.
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { InventoryItem } from '../src/inventory/entities/inventory.entity';
import { Order } from '../src/orders/entities/order.entity';
import { OrderItem } from '../src/orders/entities/order-item.entity';
import { Payment } from '../src/payments/entities/payment.entity';
import { ReturnRequest } from '../src/returns/entities/return-request.entity';
import { SellerPayout } from '../src/seller/entities/seller-payout.entity';

async function main() {
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) throw new Error('POSTGRES_URL must be set');

  const dataSource = new DataSource({
    type: 'postgres',
    url: postgresUrl,
    entities: [InventoryItem, Order, OrderItem, Payment, ReturnRequest, SellerPayout],
    synchronize: true,
  });
  await dataSource.initialize();
  console.log('Postgres schema synchronized.');
  await dataSource.destroy();
}

main().catch((err) => {
  console.error('Schema sync failed:', err);
  process.exit(1);
});
