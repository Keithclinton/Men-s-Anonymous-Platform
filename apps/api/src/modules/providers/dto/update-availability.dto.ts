import { IsObject } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsObject()
  availability: Record<string, unknown>;
}
