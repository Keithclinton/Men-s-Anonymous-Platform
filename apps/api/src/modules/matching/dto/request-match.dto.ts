import { IsDateString, IsIn, IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class RequestMatchDto {
  @IsString()
  @MinLength(2)
  specialty: string;

  @IsDateString()
  scheduledStart: string;

  @IsInt()
  @Min(15)
  @Max(180)
  durationMin: number;

  @IsIn(['CHAT', 'VIDEO'])
  channelType: 'CHAT' | 'VIDEO';
}
