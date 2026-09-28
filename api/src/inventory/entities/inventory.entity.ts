import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('inventory')
export class InventoryItem {
  @PrimaryColumn({ type: 'varchar' })
  sku: string;

  @Column({ type: 'varchar' })
  product_id: string;

  @Column({ type: 'varchar' })
  seller_id: string;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'int', default: 0 })
  reserved_qty: number;

  @Column({ type: 'int', default: 5 })
  low_stock_threshold: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_seed_data: boolean;
}
