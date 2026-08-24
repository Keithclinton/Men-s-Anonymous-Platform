import { IsDateString, IsInt, Max, Min } from 'class-validator';

export class CreateSlotDto {
  @IsDateString()
  start: string;

  @IsInt()
  @Min(15)
  @Max(180)
  durationMin: number;
}
