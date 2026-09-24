import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './order.entity';

export type FulfillmentStatus = 'pending' | 'shipped' | 'delivered';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'uuid' })
  order_id: string;

  @Column({ type: 'varchar' })
  product_id: string;

  @Column({ type: 'varchar' })
  sku: string;

  @Column({ type: 'varchar' })
  seller_id: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  unit_price: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'varchar', default: 'pending' })
  fulfillment_status: FulfillmentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  shipped_at: Date | null;

  // Starts the return window; older rows fall back to the order's updated_at.
  @Column({ type: 'timestamptz', nullable: true })
  delivered_at: Date | null;

  // Snapshot of the product's return window at purchase time (null = not returnable / legacy row).
  @Column({ type: 'int', nullable: true })
  return_window_days: number | null;

  @Column({ type: 'boolean', default: false })
  is_seed_data: boolean;
}
