import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * For machine-to-machine endpoints that must bypass user JWT entirely — the scheduled
 * sweeps (billing reconciliation, match-expiry) that used to be triggered by a persistent
 * apps/worker process and are now Vercel Cron Jobs instead (see vercel.json).
 *
 * Checks the standard `Authorization: Bearer <token>` header rather than a custom one:
 * Vercel Cron doesn't let you attach arbitrary headers to a scheduled invocation, but it
 * does automatically send `Authorization: Bearer $CRON_SECRET` if that env var is set on
 * the project — see https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs.
 * Combine with @Public() so the global JwtAuthGuard doesn't also demand a user token.
 */
@Injectable()
export class InternalSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];
    const provided = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
    const expected = this.config.get<string>('CRON_SECRET');

    if (!expected || provided !== expected) {
      throw new UnauthorizedException('Invalid or missing cron secret');
    }
    return true;
  }
}
