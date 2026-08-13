import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * For machine-to-machine endpoints (apps/worker -> apps/api) that must bypass user JWT
 * entirely, e.g. triggering the billing reconciliation sweep on a schedule. Combine with
 * @Public() so the global JwtAuthGuard doesn't also demand a user token.
 */
@Injectable()
export class InternalSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const provided = request.headers['x-internal-secret'];
    const expected = this.config.get<string>('INTERNAL_API_SECRET');

    if (!expected || provided !== expected) {
      throw new UnauthorizedException('Invalid internal secret');
    }
    return true;
  }
}
