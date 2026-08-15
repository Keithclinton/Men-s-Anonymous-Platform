import { IsIn, IsOptional, IsString, IsUUID, MinLength, ValidateIf } from 'class-validator';

export class CreateRevealGrantDto {
  @IsUUID()
  providerId: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsIn(['ANONYMOUS', 'FIRST_NAME', 'FULL_NAME', 'NAME_PHOTO'])
  level: 'ANONYMOUS' | 'FIRST_NAME' | 'FULL_NAME' | 'NAME_PHOTO';

  @ValidateIf((o: CreateRevealGrantDto) => o.level === 'FIRST_NAME' || o.level === 'FULL_NAME' || o.level === 'NAME_PHOTO')
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ValidateIf((o: CreateRevealGrantDto) => o.level === 'FULL_NAME' || o.level === 'NAME_PHOTO')
  @IsString()
  @MinLength(1)
  fullName?: string;

  @ValidateIf((o: CreateRevealGrantDto) => o.level === 'NAME_PHOTO')
  @IsString()
  @MinLength(1)
  photoUrl?: string;
}
