import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'completed';

@Entity('return_requests')
export class ReturnRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  order_item_id: string;

  @Column({ type: 'varchar' })
  requested_by: string;

  @Column({ type: 'varchar' })
  reason: string;

  @Column({ type: 'varchar', default: 'requested' })
  status: ReturnStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_seed_data: boolean;
}
