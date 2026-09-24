import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type PayoutStatus = 'processing' | 'paid' | 'failed';

/** A withdrawal of settled earnings from the seller's wallet to their bank account. */
@Entity('seller_payouts')
export class SellerPayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  seller_id: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', default: 'processing' })
  status: PayoutStatus;

  // Bank transfer reference (UTR) shown on the seller's statement.
  @Column({ type: 'varchar' })
  reference: string;

  // Human-readable destination, e.g. "HDFC Bank ••1234", frozen at payout time.
  @Column({ type: 'varchar' })
  destination: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  processed_at: Date | null;
}
