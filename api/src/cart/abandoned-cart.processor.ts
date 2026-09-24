import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import { Cart, CartDocument } from './schemas/cart.schema';

const IDLE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

@Processor('abandoned-cart-scan')
export class AbandonedCartProcessor extends WorkerHost {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private notifications: NotificationsService,
  ) {
    super();
  }

  async process(): Promise<void> {
    const cutoff = new Date(Date.now() - IDLE_THRESHOLD_MS);
    const idleCarts = await this.cartModel
      .find({
        userId: { $ne: null },
        lastActivityAt: { $lte: cutoff },
        'items.0': { $exists: true },
        reminderSentAt: null,
      })
      .exec();

    for (const cart of idleCarts) {
      await this.notifications.enqueue({
        type: 'abandoned-cart',
        to: String(cart.userId),
        payload: { cartId: String(cart._id), itemCount: cart.items.length },
      });
      await this.cartModel.updateOne({ _id: cart._id }, { $set: { reminderSentAt: new Date() } });
    }
  }
}
