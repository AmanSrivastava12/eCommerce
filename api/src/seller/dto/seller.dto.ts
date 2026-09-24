import { IsNumber, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';

export class CreatePayoutDto {
  /** Defaults to the full available balance when omitted. */
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;
}

export class BankAccountDto {
  @IsString()
  @MinLength(2)
  accountHolderName: string;

  @IsString()
  @MinLength(2)
  bankName: string;

  @Matches(/^\d{6,18}$/, { message: 'Account number must be 6–18 digits' })
  accountNumber: string;

  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Enter a valid IFSC code' })
  ifsc: string;
}
