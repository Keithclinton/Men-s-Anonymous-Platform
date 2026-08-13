import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'auditAction';

/** Tags a route so AuditInterceptor writes an AuditLog entry after it succeeds. */
export const Audit = (action: string) => SetMetadata(AUDIT_ACTION_KEY, action);
