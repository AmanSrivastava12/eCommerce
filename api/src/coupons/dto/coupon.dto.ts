import { IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCouponDto {
  @IsString() code: string;
  @IsIn(['percent', 'flat']) discountType: 'percent' | 'flat';
  @IsNumber() @Min(0) discountValue: number;
  @IsOptional() @IsNumber() @Min(0) minCartValue?: number | null;
  @IsOptional() @IsNumber() @Min(0) maxDiscountAmount?: number | null;
  @IsDateString() validFrom: string;
  @IsDateString() validTo: string;
  @IsOptional() @IsNumber() @Min(1) usageLimitPerUser?: number | null;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateCouponDto {
  @IsOptional() @IsNumber() @Min(0) discountValue?: number;
  @IsOptional() @IsDateString() validFrom?: string;
  @IsOptional() @IsDateString() validTo?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
