import { IsIn, IsString } from 'class-validator';

export class CreateReturnDto {
  @IsString() reason: string;
}

export class UpdateReturnDto {
  @IsIn(['approved', 'rejected', 'completed'])
  status: 'approved' | 'rejected' | 'completed';
}
