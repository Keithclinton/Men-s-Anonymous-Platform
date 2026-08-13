import { Type } from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RateCardDto } from './rate-card.dto';

export class UpsertProfileDto {
  @IsString()
  @MinLength(2)
  displayName: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsArray()
  @IsString({ each: true })
  specialties: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => RateCardDto)
  rateCard?: RateCardDto;

  @IsOptional()
  @IsObject()
  availability?: Record<string, unknown>;
}
