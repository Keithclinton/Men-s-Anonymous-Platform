import { IsEmail, IsString, ValidateIf } from 'class-validator';

export class LoginDto {
  /** CLIENT accounts. Mutually exclusive with email — the frontend sends whichever the user typed. */
  @ValidateIf((o: LoginDto) => !o.email)
  @IsString()
  username?: string;

  /** PROVIDER accounts — resolved to a pseudonym via the vault's emailHash lookup. */
  @ValidateIf((o: LoginDto) => !o.username)
  @IsEmail()
  email?: string;

  @IsString()
  password: string;
}
