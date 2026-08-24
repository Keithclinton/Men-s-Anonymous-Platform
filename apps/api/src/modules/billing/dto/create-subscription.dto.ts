import { IsIn, IsString, MinLength } from 'class-validator';

export class CreateSubscriptionDto {
  @IsIn(['starter', 'standard'])
  plan: 'starter' | 'standard';

  @IsString()
  @MinLength(9)
  phone: string;
}
