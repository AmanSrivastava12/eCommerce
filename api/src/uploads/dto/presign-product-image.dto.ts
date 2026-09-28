import { IsString } from 'class-validator';

export class PresignProductImageDto {
  @IsString() contentType: string;
}
