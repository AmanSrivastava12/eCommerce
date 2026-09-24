import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsString() sku: string;
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) deliveryRating?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) packagingRating?: number;
  @IsOptional() @IsString() title?: string;
  @IsString() comment: string;
  @IsOptional() images?: string[];
}
