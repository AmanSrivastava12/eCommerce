import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsOptional() @IsMongoId() parentId?: string | null;
  @IsOptional() @IsString() imageUrl?: string | null;
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsMongoId() parentId?: string | null;
  @IsOptional() @IsString() imageUrl?: string | null;
}
