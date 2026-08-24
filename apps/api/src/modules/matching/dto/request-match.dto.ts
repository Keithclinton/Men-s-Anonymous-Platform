import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class RequestMatchDto {
  @IsString()
  @MinLength(2)
  specialty: string;

  @IsOptional()
  @IsIn(['COUNSELOR', 'MODERATOR'])
  kind?: 'COUNSELOR' | 'MODERATOR';

  @IsDateString()
  scheduledStart: string;

  @IsInt()
  @Min(15)
  @Max(180)
  durationMin: number;

  @IsIn(['CHAT', 'VIDEO'])
  channelType: 'CHAT' | 'VIDEO';
}
