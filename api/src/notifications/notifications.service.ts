import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

export interface NotificationJob {
  type:
    | 'order-confirmation'
    | 'seller-new-order'
    | 'low-stock'
    | 'abandoned-cart'
    | 'seller-verification-update'
    | 'password-reset';
  to: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@InjectQueue('notifications') private queue: Queue<NotificationJob>) {}

  async enqueue(job: NotificationJob) {
    this.logger.log(`Queueing notification: ${job.type} -> ${job.to}`);
    await this.queue.add(job.type, job, {
      removeOnComplete: true,
      removeOnFail: 100,
    });
  }
}
