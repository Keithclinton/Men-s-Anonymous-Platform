import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username may only contain letters, numbers, and underscores',
  })
  username: string;

  @IsString()
  @MinLength(10, { message: 'password must be at least 10 characters' })
  password: string;

  @IsOptional()
  @IsIn(['CLIENT', 'PROVIDER'])
  role?: 'CLIENT' | 'PROVIDER';

  /** Optional — only used for account recovery. Stored encrypted in the vault, never here. */
  @IsOptional()
  @IsEmail()
  email?: string;

  /** Optional — E.164 format recommended (e.g. +2547XXXXXXXX) for later M-Pesa reuse. */
  @IsOptional()
  @IsString()
  phone?: string;
}
