import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product, ProductSchema } from '../catalog/schemas/product.schema';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { ReturnRequest } from '../returns/entities/return-request.entity';
import { UsersModule } from '../users/users.module';
import { SellerPayout } from './entities/seller-payout.entity';
import { SellerController } from './seller.controller';
import { SellerService } from './seller.service';

/** Seller-facing order details, wallet/ledger and payouts. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, ReturnRequest, Payment, SellerPayout]),
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    UsersModule,
  ],
  controllers: [SellerController],
  providers: [SellerService],
})
export class SellerModule {}
