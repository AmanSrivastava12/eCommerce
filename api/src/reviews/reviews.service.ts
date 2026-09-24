import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model, Types } from 'mongoose';
import { Repository } from 'typeorm';
import { Product, ProductDocument } from '../catalog/schemas/product.schema';
import { ProductsService } from '../catalog/products.service';
import { OrderItem } from '../orders/entities/order-item.entity';
import { UsersService } from '../users/users.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review, ReviewDocument } from './schemas/review.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectRepository(OrderItem) private orderItemsRepo: Repository<OrderItem>,
    private productsService: ProductsService,
    private usersService: UsersService,
  ) {}

  findForProduct(productId: string, sku?: string) {
    const filter: Record<string, unknown> = { productId: new Types.ObjectId(productId) };
    if (sku) filter.sku = sku;
    return this.reviewModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  findForSeller(productIds: string[]) {
    return this.reviewModel
      .find({ productId: { $in: productIds.map((id) => new Types.ObjectId(id)) } })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Review/rating authorization rule (see docs/implementation-plan.md): only a logged-in
   * user with a completed order containing this exact productId + sku may review it.
   * `userId` here always comes from the JWT-authenticated request (the auth guard already
   * rejected unauthenticated callers before this runs) — never trust a client-supplied id.
   */
  async create(userId: string, productId: string, dto: CreateReviewDto) {
    const orderItem = await this.orderItemsRepo.findOne({
      where: { product_id: productId, sku: dto.sku },
      relations: { order: true },
    });
    const ownsPurchase =
      orderItem &&
      orderItem.order?.user_id === userId &&
      ['paid', 'shipped', 'delivered'].includes(orderItem.order.status);
    if (!ownsPurchase) {
      throw new ForbiddenException(
        'You can only review a product variant you have purchased and received',
      );
    }

    const review = await this.reviewModel.findOneAndUpdate(
      { productId: new Types.ObjectId(productId), sku: dto.sku, userId: new Types.ObjectId(userId) },
      {
        $set: {
          rating: dto.rating,
          deliveryRating: dto.deliveryRating ?? null,
          packagingRating: dto.packagingRating ?? null,
          title: dto.title ?? null,
          comment: dto.comment,
          images: dto.images ?? [],
          orderId: orderItem!.order_id,
        },
      },
      { upsert: true, returnDocument: 'after' },
    );

    await this.recalculateSummaries(productId);
    return review;
  }

  private async recalculateSummaries(productId: string) {
    const product = await this.productModel.findById(productId).exec();
    if (!product) return;

    const productReviews = await this.reviewModel.find({ productId: product._id }).exec();
    const productAvg = average(productReviews.map((r) => r.rating));
    await this.productsService.recalculateRatingSummary(
      productId,
      productAvg,
      productReviews.length,
    );

    const sellerProductIds = await this.productModel
      .find({ sellerId: product.sellerId })
      .distinct('_id')
      .exec();
    const sellerReviews = await this.reviewModel
      .find({ productId: { $in: sellerProductIds } })
      .exec();

    const overall = average(sellerReviews.map((r) => r.rating));
    const delivery = average(
      sellerReviews.filter((r) => r.deliveryRating != null).map((r) => r.deliveryRating as number),
    );
    const packaging = average(
      sellerReviews.filter((r) => r.packagingRating != null).map((r) => r.packagingRating as number),
    );

    const seller = await this.usersService.findById(String(product.sellerId));
    if (seller?.sellerProfile) {
      seller.sellerProfile.ratingSummary = {
        overall: { average: overall, count: sellerReviews.length },
        productQuality: { average: overall, count: sellerReviews.length },
        deliveryTimeliness: {
          average: delivery,
          count: sellerReviews.filter((r) => r.deliveryRating != null).length,
        },
        packaging: {
          average: packaging,
          count: sellerReviews.filter((r) => r.packagingRating != null).length,
        },
      };
      await seller.save();
    }
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}
