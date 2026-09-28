import { IsDateString, IsString } from 'class-validator';

export class CreateSaleDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsDateString() startAt: string;
  @IsDateString() endAt: string;
}

export class UpdateSaleDto {
  @IsString() name?: string;
  @IsDateString() startAt?: string;
  @IsDateString() endAt?: string;
}
