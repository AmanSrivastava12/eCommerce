import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class AddressDto {
  @IsString()
  @MinLength(1)
  label: string;

  @IsString()
  @MinLength(1)
  line1: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsString()
  @MinLength(1)
  city: string;

  @IsString()
  @MinLength(1)
  state: string;

  @IsString()
  @MinLength(1)
  postalCode: string;

  @IsString()
  @MinLength(1)
  country: string;

  @IsString()
  @MinLength(5)
  phone: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
