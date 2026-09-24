import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddCartItemDto {
  @IsString() productId: string;
  @IsString() sku: string;
  @IsInt() @Min(1) quantity: number;
  @IsOptional() @IsString() guestSessionId?: string;
}

export class UpdateCartItemDto {
  @IsInt() @Min(1) quantity: number;
  @IsOptional() @IsString() guestSessionId?: string;
}

export class ApplyCouponDto {
  @IsString() code: string;
  @IsOptional() @IsString() guestSessionId?: string;
}
