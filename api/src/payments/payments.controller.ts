import { Controller, Headers, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from './payments.service';

@Public()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly ordersService: OrdersService,
  ) {}

  @Post('webhook')
  async webhook(@Req() req: Request, @Headers('stripe-signature') signature: string) {
    const event = this.paymentsService.constructWebhookEvent(req.body, signature);
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as unknown as { id: string; metadata: Record<string, string> };
      if (intent.metadata?.kind === 'checkout') {
        await this.ordersService.fulfillCheckoutIntent(intent);
      } else if (intent.metadata?.orderId) {
        // Intents created by the old order-first flow.
        await this.ordersService.markPaid(intent.metadata.orderId);
      }
    }
    return { received: true };
  }
}
