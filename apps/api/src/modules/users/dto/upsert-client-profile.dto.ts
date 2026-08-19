import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertClientProfileDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsIn(['CHAT', 'VIDEO'])
  preferredChannel?: 'CHAT' | 'VIDEO';

  /** Free text for a provider's context before a session. Encrypted at rest — see users.service.ts. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  intakeNotes?: string;
}
