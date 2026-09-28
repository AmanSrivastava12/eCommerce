import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { Model, Types } from 'mongoose';
import { Role } from '../common/roles.enum';
import { AddressDto } from './dto/address.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { REDIS_CLIENT } from '../redis/redis.module';
import { PayoutDetails, User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  /** Only for credential checks — every other lookup leaves the hash unselected. */
  findByEmailWithPassword(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+passwordHash').exec();
  }

  findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  create(data: Partial<User>) {
    return this.userModel.create(data);
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: { passwordHash } }, { returnDocument: 'after' })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userModel.findById(userId).select('+passwordHash').exec();
    if (!user) throw new NotFoundException('User not found');
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Your current password is incorrect');
    }
    if (await bcrypt.compare(dto.newPassword, user.passwordHash)) {
      throw new BadRequestException('Choose a password different from your current one');
    }
    await this.updatePasswordHash(userId, await bcrypt.hash(dto.newPassword, 10));
    // Same policy as a reset: revoke every refresh token so other devices must sign in again.
    const refreshKeys = await this.redis.keys(`refresh:${userId}:*`);
    if (refreshKeys.length > 0) await this.redis.del(...refreshKeys);
    return { message: 'Your password has been updated.' };
  }

  async setPayoutDetails(userId: string, details: PayoutDetails) {
    const user = await this.findByIdOrThrow(userId);
    if (!user.sellerProfile) throw new BadRequestException('User is not a seller');
    user.sellerProfile.payoutDetails = details;
    user.markModified('sellerProfile.payoutDetails');
    await user.save();
    return details;
  }

  async setStripeCustomerId(userId: string, stripeCustomerId: string) {
    await this.userModel.updateOne({ _id: userId }, { $set: { stripeCustomerId } }).exec();
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: dto }, { returnDocument: 'after' })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async listAddresses(userId: string) {
    const user = await this.findByIdOrThrow(userId);
    return user.addresses;
  }

  async addAddress(userId: string, dto: AddressDto) {
    const user = await this.findByIdOrThrow(userId);
    if (dto.isDefault) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }
    if (user.addresses.length === 0) {
      dto.isDefault = true;
    }
    user.addresses.push(dto as any);
    await user.save();
    return user.addresses;
  }

  async updateAddress(userId: string, addressId: string, dto: Partial<AddressDto>) {
    const user = await this.findByIdOrThrow(userId);
    const address = (user.addresses as any).id
      ? (user.addresses as any).id(addressId)
      : user.addresses[Number(addressId)];
    if (!address) throw new NotFoundException('Address not found');
    if (dto.isDefault) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }
    Object.assign(address, dto);
    await user.save();
    return user.addresses;
  }

  async removeAddress(userId: string, addressId: string) {
    const user = await this.findByIdOrThrow(userId);
    user.addresses = user.addresses.filter(
      (a: any) => String(a._id ?? a.id) !== addressId,
    ) as any;
    await user.save();
    return user.addresses;
  }

  async setSellerVerification(
    sellerId: string,
    status: 'pending' | 'verified' | 'rejected',
  ) {
    const user = await this.findByIdOrThrow(sellerId);
    if (user.role !== Role.Seller || !user.sellerProfile) {
      throw new BadRequestException('User is not a seller');
    }
    user.sellerProfile.verificationStatus = status;
    user.sellerProfile.verifiedAt = status === 'verified' ? new Date() : undefined;
    await user.save();
    return user;
  }

  async deactivate(userId: string) {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: { isActive: false } }, { returnDocument: 'after' })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  listAll(filter: { role?: string } = {}) {
    const query: Record<string, unknown> = {};
    if (filter.role) query.role = filter.role;
    return this.userModel.find(query).exec();
  }

  listPendingSellers() {
    return this.userModel
      .find({ role: Role.Seller, 'sellerProfile.verificationStatus': 'pending' })
      .exec();
  }

  private async findByIdOrThrow(userId: string) {
    if (!Types.ObjectId.isValid(userId)) throw new NotFoundException('User not found');
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
