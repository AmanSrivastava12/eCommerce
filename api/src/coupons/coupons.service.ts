import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';
import { Coupon, CouponDocument } from './schemas/coupon.schema';

@Injectable()
export class CouponsService {
  constructor(@InjectModel(Coupon.name) private couponModel: Model<CouponDocument>) {}

  findAll() {
    return this.couponModel.find().sort({ createdAt: -1 }).exec();
  }

  create(dto: CreateCouponDto) {
    return this.couponModel.create({ ...dto, code: dto.code.toUpperCase() });
  }

  async update(id: string, dto: UpdateCouponDto) {
    const coupon = await this.couponModel.findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after' }).exec();
    if (!coupon) throw new BadRequestException('Coupon not found');
    return coupon;
  }

  /**
   * Validates a coupon against the cart subtotal and past usage; throws with a specific
   * reason if invalid. Called both when a customer applies a code and again at checkout.
   */
  async validateForCart(code: string, subtotal: number, timesUsedByUser: number) {
    const coupon = await this.couponModel.findOne({ code: code.toUpperCase() }).exec();
    if (!coupon || !coupon.active) {
      throw new BadRequestException('Coupon code is invalid');
    }
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validTo) {
      throw new BadRequestException('Coupon is not currently valid');
    }
    if (coupon.minCartValue && subtotal < coupon.minCartValue) {
      throw new BadRequestException(`Coupon requires a minimum cart value of ${coupon.minCartValue}`);
    }
    if (coupon.usageLimitPerUser && timesUsedByUser >= coupon.usageLimitPerUser) {
      throw new BadRequestException('You have reached the usage limit for this coupon');
    }

    let discount =
      coupon.discountType === 'percent' ? (subtotal * coupon.discountValue) / 100 : coupon.discountValue;
    if (coupon.maxDiscountAmount) {
      discount = Math.min(discount, coupon.maxDiscountAmount);
    }
    discount = Math.min(discount, subtotal);

    return { coupon, discountApplied: Number(discount.toFixed(2)) };
  }
}
