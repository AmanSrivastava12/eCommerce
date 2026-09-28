import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { Payment } from './entities/payment.entity';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), forwardRef(() => OrdersModule), UsersModule],
  controllers: [PaymentsController, PaymentMethodsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
