import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationJob } from './notifications.service';

/**
 * Sends the actual email/push (Resend/SendGrid/Expo push, per the plan). Stubbed to a log
 * line so the queueing/plumbing can be verified without real provider credentials.
 */
@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job<NotificationJob>): Promise<void> {
    this.logger.log(`Sending ${job.data.type} to ${job.data.to}: ${JSON.stringify(job.data.payload)}`);
  }
}
