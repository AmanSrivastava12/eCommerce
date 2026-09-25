import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class DescriptionSectionDto {
  @IsString() heading: string;
  @IsString() content: string;
}

class SpecItemDto {
  @IsString() key: string;
  @IsString() value: string;
}

class SpecGroupDto {
  @IsString() group: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => SpecItemDto) items: SpecItemDto[];
}

class ProductDescriptionDto {
  @IsString() short: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DescriptionSectionDto)
  sections: DescriptionSectionDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecGroupDto)
  specifications: SpecGroupDto[];
}

class FaqDto {
  @IsString() question: string;
  @IsString() answer: string;
}

class ProductImagesDto {
  @IsString() main: string;
  @IsArray() @IsString({ each: true }) gallery: string[];
}

class ProductPricingDto {
  @IsNumber() @Min(0) basePrice: number;
  @IsString() currency: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) discountPercent?: number | null;
  @IsOptional() @IsNumber() @Min(0) discountAmount?: number | null;
  @IsOptional() @IsMongoId() activeSaleId?: string | null;
  @IsOptional() @IsNumber() @Min(0) salePrice?: number | null;
}

class ProductVariantDto {
  @IsString() sku: string;
  // Needs a decorator: with forbidNonWhitelisted, an undecorated property is rejected outright.
  @IsOptional() @IsObject() attributes?: Record<string, string>;
  @IsOptional() @IsNumber() @Min(0) priceOverride?: number | null;
  @IsArray() @IsString({ each: true }) images: string[];
  @IsInt() @Min(0) initialQuantity: number;
}

class ProductFulfillmentDto {
  @IsOptional() @IsString() warranty?: string | null;
  @IsOptional() @IsBoolean() isAssured?: boolean;
  @IsOptional() @IsInt() @Min(0) returnWindowDays?: number | null;
  @IsOptional() @IsInt() @Min(0) replacementWindowDays?: number | null;
  @IsOptional() @IsNumber() @Min(0) shippingFee?: number;
  @IsString() shipsFromPincode: string;
  @IsOptional() @IsArray() @IsString({ each: true }) serviceablePincodes?: string[] | null;
  @IsInt() @Min(0) estimatedDeliveryDays: number;
}

export class CreateProductDto {
  @IsString() title: string;
  @IsMongoId() categoryId: string;
  @ValidateNested() @Type(() => ProductDescriptionDto) description: ProductDescriptionDto;
  @IsArray() @ValidateNested({ each: true }) @Type(() => FaqDto) faqs: FaqDto[];
  @ValidateNested() @Type(() => ProductImagesDto) images: ProductImagesDto;
  @ValidateNested() @Type(() => ProductPricingDto) pricing: ProductPricingDto;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants: ProductVariantDto[];
  @ValidateNested() @Type(() => ProductFulfillmentDto) fulfillment: ProductFulfillmentDto;
  @IsOptional() @IsIn(['draft', 'active', 'inactive']) status?: 'draft' | 'active' | 'inactive';
}

export class UpdateProductDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsMongoId() categoryId?: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductDescriptionDto)
  description?: ProductDescriptionDto;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqDto)
  faqs?: FaqDto[];
  @IsOptional() @ValidateNested() @Type(() => ProductImagesDto) images?: ProductImagesDto;
  @IsOptional() @ValidateNested() @Type(() => ProductPricingDto) pricing?: ProductPricingDto;
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductFulfillmentDto)
  fulfillment?: ProductFulfillmentDto;
  @IsOptional() @IsIn(['draft', 'active', 'inactive']) status?: 'draft' | 'active' | 'inactive';
}
