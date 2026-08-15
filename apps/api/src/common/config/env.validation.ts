import { plainToInstance } from 'class-transformer';
import { IsIn, IsInt, IsString, Max, MinLength, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: string;

  @IsInt()
  @Max(65535)
  PORT: number;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  VAULT_DATABASE_URL: string;

  @IsString()
  REDIS_URL: string;

  @IsString()
  @MinLength(16, { message: 'JWT_ACCESS_SECRET must be at least 16 characters' })
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_ACCESS_TTL: string;

  @IsString()
  @MinLength(16, { message: 'JWT_REFRESH_SECRET must be at least 16 characters' })
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_REFRESH_TTL: string;

  @IsString()
  ENCRYPTION_KEY: string;

  @IsString()
  HASH_KEY: string;
}

/**
 * Fails startup fast if required config is missing/malformed, rather than letting a
 * misconfigured deploy silently run with an empty JWT secret or no encryption key.
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors
      .flatMap((e) => Object.values(e.constraints ?? {}))
      .join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${messages}`);
  }

  // Not expressible as a per-field decorator: catches the easy misconfiguration of
  // reusing one secret for two purposes, which quietly defeats the point of having both.
  if (validated.JWT_ACCESS_SECRET === validated.JWT_REFRESH_SECRET) {
    throw new Error(
      'Invalid environment configuration:\n  - JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values',
    );
  }
  if (validated.ENCRYPTION_KEY === validated.HASH_KEY) {
    throw new Error(
      'Invalid environment configuration:\n  - ENCRYPTION_KEY and HASH_KEY must be different values',
    );
  }

  return validated;
}
