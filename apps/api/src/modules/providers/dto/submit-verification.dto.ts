import { IsDateString, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class SubmitVerificationDto {
  @IsString()
  @MinLength(2)
  licenseNumber: string;

  @IsOptional()
  @IsObject()
  documentRefs?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  verifyingBody?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
