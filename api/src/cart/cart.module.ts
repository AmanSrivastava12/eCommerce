import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogModule } from '../catalog/catalog.module';
import { CouponsModule } from '../coupons/coupons.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AbandonedCartProcessor } from './abandoned-cart.processor';
import { AbandonedCartScheduler } from './abandoned-cart.scheduler';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { Cart, CartSchema } from './schemas/cart.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }]),
    BullModule.registerQueue({ name: 'abandoned-cart-scan' }),
    CatalogModule,
    CouponsModule,
    NotificationsModule,
  ],
  controllers: [CartController],
  providers: [CartService, AbandonedCartProcessor, AbandonedCartScheduler],
  exports: [CartService],
})
export class CartModule {}
