import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../common/roles.enum';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsIn([Role.Customer, Role.Seller])
  role?: Role.Customer | Role.Seller;

  @IsOptional()
  @IsString()
  businessName?: string;
}
