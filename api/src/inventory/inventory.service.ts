import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { InventoryItem } from './entities/inventory.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem) private repo: Repository<InventoryItem>,
    private dataSource: DataSource,
    private notifications: NotificationsService,
  ) {}

  create(item: Partial<InventoryItem>) {
    return this.repo.save(this.repo.create(item));
  }

  findBySku(sku: string) {
    return this.repo.findOne({ where: { sku } });
  }

  findBySkus(skus: string[]) {
    if (skus.length === 0) return Promise.resolve([]);
    return this.repo
      .createQueryBuilder('inventory')
      .where('inventory.sku IN (:...skus)', { skus })
      .getMany();
  }

  findBySellerId(sellerId: string) {
    return this.repo.find({ where: { seller_id: sellerId } });
  }

  /** Deletes stock rows for variants a seller removed from their product. */
  async removeSkus(sellerId: string, skus: string[]) {
    if (skus.length === 0) return;
    await this.repo.delete({ seller_id: sellerId, sku: In(skus) });
  }

  availableQuantity(item: InventoryItem) {
    return item.quantity - item.reserved_qty;
  }

  async updateForSeller(
    sellerId: string,
    sku: string,
    updates: { quantity?: number; lowStockThreshold?: number },
  ) {
    const item = await this.repo.findOne({ where: { sku } });
    if (!item) throw new NotFoundException('SKU not found');
    if (item.seller_id !== sellerId) {
      throw new BadRequestException('You do not own this SKU');
    }
    const wasAboveThreshold = item.quantity > item.low_stock_threshold;
    if (updates.quantity !== undefined) item.quantity = updates.quantity;
    if (updates.lowStockThreshold !== undefined)
      item.low_stock_threshold = updates.lowStockThreshold;
    await this.repo.save(item);

    if (wasAboveThreshold && item.quantity <= item.low_stock_threshold) {
      await this.notifications.enqueue({
        type: 'low-stock',
        to: sellerId,
        payload: { sku: item.sku, quantity: item.quantity, threshold: item.low_stock_threshold },
      });
    }
    return item;
  }

  /**
   * Reserves stock for the given SKU/quantity pairs inside the caller's transaction,
   * throwing if any item is unavailable. Used by OrdersService's checkout transaction.
   */
  async decrementForOrder(
    manager: DataSource['manager'],
    items: { sku: string; quantity: number }[],
  ) {
    for (const { sku, quantity } of items) {
      const before = await manager.findOne(InventoryItem, { where: { sku } });
      const result = await manager
        .createQueryBuilder()
        .update(InventoryItem)
        .set({ quantity: () => `quantity - ${Number(quantity)}` })
        .where('sku = :sku AND quantity - reserved_qty >= :quantity', { sku, quantity })
        .execute();
      if (result.affected === 0) {
        throw new BadRequestException(`Insufficient stock for SKU ${sku}`);
      }
      const after = await manager.findOne(InventoryItem, { where: { sku } });
      const crossedThreshold =
        before && after && before.quantity > before.low_stock_threshold &&
        after.quantity <= after.low_stock_threshold;
      if (crossedThreshold && after) {
        await this.notifications.enqueue({
          type: 'low-stock',
          to: after.seller_id,
          payload: { sku: after.sku, quantity: after.quantity },
        });
      }
    }
  }
}
