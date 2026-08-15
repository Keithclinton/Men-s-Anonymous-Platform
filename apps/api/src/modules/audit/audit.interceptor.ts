import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AUDIT_ACTION_KEY } from './audit.decorator';

/**
 * Opt-in via @Audit('SOME_ACTION') on a controller method. Only fires after a successful
 * response — failed attempts are already covered by the request logger, and we don't want
 * to record an action that didn't actually happen.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string | undefined>(AUDIT_ACTION_KEY, context.getHandler());
    if (!action) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const actorPseudonym = request.user?.userId ?? 'anonymous';

    return next.handle().pipe(
      tap(() => {
        void this.audit.record({
          actorPseudonym,
          action,
          target: request.params?.id ?? request.url,
        });
      }),
    );
  }
}
