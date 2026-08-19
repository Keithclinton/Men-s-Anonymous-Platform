import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';

export class SignupDto {
  @IsOptional()
  @IsIn(['CLIENT', 'PROVIDER'])
  role?: 'CLIENT' | 'PROVIDER';

  /**
   * Required for CLIENT (the pseudonymous handle they're known by), unused for PROVIDER —
   * providers aren't meant to be anonymous, so they sign in with email instead (see below).
   */
  @ValidateIf((o: SignupDto) => o.role !== 'PROVIDER')
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username may only contain letters, numbers, and underscores',
  })
  username?: string;

  @IsString()
  @MinLength(10, { message: 'password must be at least 10 characters' })
  password: string;

  /**
   * Required for PROVIDER — becomes their login identifier, stored encrypted in the vault
   * (never as plaintext on the User row) and looked up via emailHash. Optional recovery
   * contact for CLIENT, same as before.
   */
  @ValidateIf((o: SignupDto) => o.role === 'PROVIDER' || !!o.email)
  @IsEmail()
  email?: string;

  /** Optional — E.164 format recommended (e.g. +2547XXXXXXXX) for later M-Pesa reuse. */
  @IsOptional()
  @IsString()
  phone?: string;
}
