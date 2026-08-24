import { IsDateString, IsIn, IsInt, IsOptional, IsUUID, Max, Min, ValidateIf } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  providerId: string;

  /** Book a published open slot directly — mutually exclusive with scheduledStart/durationMin below. */
  @IsOptional()
  @IsUUID()
  slotId?: string;

  @ValidateIf((o: CreateBookingDto) => !o.slotId)
  @IsDateString()
  scheduledStart?: string;

  @ValidateIf((o: CreateBookingDto) => !o.slotId)
  @IsInt()
  @Min(15)
  @Max(180)
  durationMin?: number;

  @IsIn(['CHAT', 'VIDEO'])
  channelType: 'CHAT' | 'VIDEO';
}
