import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
  ValidationArguments,
} from 'class-validator';

export class SignupDto {
  @IsOptional()
  @IsIn(['CLIENT', 'PROVIDER'])
  role?: 'CLIENT' | 'PROVIDER';

  /**
   * Required for CLIENT (the pseudonymous handle they're known by). Optional for PROVIDER —
   * login still always uses email (see below), but if given, this handle is kept as their
   * internal/admin-facing identifier instead of an opaque generated one. Validated the same
   * way for both roles whenever it's actually present.
   */
  @ValidateIf((o: SignupDto) => o.role !== 'PROVIDER' || !!o.username)
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
  @IsEmail(
    {},
    {
      message: (args: ValidationArguments) =>
        (args.object as SignupDto).role === 'PROVIDER'
          ? 'A valid email is required to register as a provider — CLIENT accounts use a handle instead'
          : 'email must be a valid email address',
    },
  )
  email?: string;

  /** Optional — E.164 format recommended (e.g. +2547XXXXXXXX) for later M-Pesa reuse. */
  @IsOptional()
  @IsString()
  phone?: string;
}
