import { IsString, MinLength } from 'class-validator';

export class BreakGlassDto {
  /** Required, not optional — a justification is the whole point of this path. */
  @IsString()
  @MinLength(10, { message: 'reason must be at least 10 characters — this access is logged' })
  reason: string;
}
