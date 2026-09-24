import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

export type OrderStatus = 'placed' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  user_id: string;

  @Column({ type: 'varchar', default: 'placed' })
  status: OrderStatus;

  @Column({ type: 'timestamptz', nullable: true })
  cancellable_until: Date | null;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  discount_total: number;

  @Column({ type: 'varchar', array: true, default: '{}' })
  coupon_codes: string[];

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  shipping_fee: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'varchar' })
  currency: string;

  @Column({ type: 'varchar', nullable: true })
  stripe_payment_intent: string | null;

  @Column({ type: 'jsonb' })
  shipping_address: Record<string, unknown>;

  @Column({ type: 'varchar' })
  shipping_phone: string;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_seed_data: boolean;
}
