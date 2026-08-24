import { IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class RequestPayoutDto {
  @IsString()
  @MinLength(9)
  phone: string;

  /** Omit to pay out the full available balance. */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
