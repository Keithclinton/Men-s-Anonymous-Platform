import { IsNumber, Min } from 'class-validator';

/** KES, matching the concept note's minimum-billing (<=30min) / hourly (>30min) model. */
export class RateCardDto {
  @IsNumber()
  @Min(0)
  minimumRate: number;

  @IsNumber()
  @Min(0)
  hourlyRate: number;
}
