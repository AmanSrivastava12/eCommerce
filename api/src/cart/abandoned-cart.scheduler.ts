import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class AbandonedCartScheduler implements OnModuleInit {
  constructor(@InjectQueue('abandoned-cart-scan') private queue: Queue) {}

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'abandoned-cart-hourly-scan',
      { every: 60 * 60 * 1000 },
      { name: 'scan', data: {} },
    );
  }
}
