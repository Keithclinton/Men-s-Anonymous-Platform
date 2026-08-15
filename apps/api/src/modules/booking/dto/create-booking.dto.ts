import { IsDateString, IsIn, IsInt, IsUUID, Max, Min } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  providerId: string;

  @IsDateString()
  scheduledStart: string;

  @IsInt()
  @Min(15)
  @Max(180)
  durationMin: number;

  @IsIn(['CHAT', 'VIDEO'])
  channelType: 'CHAT' | 'VIDEO';
}
