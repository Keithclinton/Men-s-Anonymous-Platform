import { IsIn } from 'class-validator';

export class DecideVerificationDto {
  @IsIn(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';
}
