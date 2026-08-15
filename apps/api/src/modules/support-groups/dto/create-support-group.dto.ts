import { IsDateString, IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateSupportGroupDto {
  @IsString()
  @MinLength(2)
  topic: string;

  @IsDateString()
  schedule: string;

  @IsInt()
  @Min(2)
  @Max(50)
  capacity: number;
}
