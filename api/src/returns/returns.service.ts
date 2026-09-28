import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { Repository } from 'typeorm';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { Product, ProductDocument } from '../catalog/schemas/product.schema';
import { CreateReturnDto } from './dto/return.dto';
import { ReturnRequest } from './entities/return-request.entity';

@Injectable()
export class ReturnsService {
  constructor(
    @InjectRepository(ReturnRequest) private returnsRepo: Repository<ReturnRequest>,
    @InjectRepository(OrderItem) private orderItemsRepo: Repository<OrderItem>,
    @InjectRepository(Order) private ordersRepo: Repository<Order>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async request(userId: string, orderId: string, itemId: string, dto: CreateReturnDto) {
    const item = await this.orderItemsRepo.findOne({ where: { id: itemId, order_id: orderId } });
    if (!item) throw new NotFoundException('Order item not found');
    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!order || order.user_id !== userId) throw new ForbiddenException('Not your order');
    if (item.fulfillment_status !== 'delivered') {
      throw new BadRequestException('Item must be delivered before a return can be requested');
    }
    const product = await this.productModel.findById(item.product_id).exec();
    const windowDays = item.return_window_days ?? product?.fulfillment?.returnWindowDays;
    if (!windowDays) {
      throw new BadRequestException('This product is not eligible for returns');
    }
    const deadline = new Date(item.delivered_at ?? order.updated_at);
    deadline.setDate(deadline.getDate() + windowDays);
    if (new Date() > deadline) {
      throw new BadRequestException('Return window has passed');
    }

    return this.returnsRepo.save(
      this.returnsRepo.create({
        order_item_id: itemId,
        requested_by: userId,
        reason: dto.reason,
        status: 'requested',
      }),
    );
  }

  findForUser(userId: string) {
    return this.returnsRepo.find({ where: { requested_by: userId }, order: { created_at: 'DESC' } });
  }

  async findForSeller(sellerId: string) {
    const items = await this.orderItemsRepo.find({ where: { seller_id: sellerId } });
    const itemIds = items.map((i) => i.id);
    if (itemIds.length === 0) return [];
    return this.returnsRepo
      .createQueryBuilder('r')
      .where('r.order_item_id IN (:...itemIds)', { itemIds })
      .orderBy('r.created_at', 'DESC')
      .getMany();
  }

  findAllForAdmin() {
    return this.returnsRepo.find({ order: { created_at: 'DESC' } });
  }

  async updateStatus(
    actorSellerId: string | null,
    id: string,
    status: 'approved' | 'rejected' | 'completed',
  ) {
    const request = await this.returnsRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Return request not found');
    if (actorSellerId) {
      const item = await this.orderItemsRepo.findOne({ where: { id: request.order_item_id } });
      if (!item || item.seller_id !== actorSellerId) {
        throw new ForbiddenException('Not your order item');
      }
    }
    request.status = status;
    return this.returnsRepo.save(request);
  }
}
