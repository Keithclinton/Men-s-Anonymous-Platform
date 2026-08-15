import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global safety net. Never lets a raw error (stack trace, ORM error with field values,
 * etc.) reach a client response — those can carry PII in a system where that's an
 * explicit hard requirement not to leak. See ARCHITECTURE.md §1 and §6.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // HttpException#getResponse() is either a plain string (most `throw new XException('...')`
    // calls) or, for ValidationPipe failures, an object shaped like
    // { statusCode, message: string[], error }. Unwrap that so callers always see a flat
    // `message: string | string[]` instead of having to branch on response shape.
    const rawResponse = exception instanceof HttpException ? exception.getResponse() : null;
    let message: string | string[];
    if (typeof rawResponse === 'string') {
      message = rawResponse;
    } else if (rawResponse && typeof rawResponse === 'object' && 'message' in rawResponse) {
      message = (rawResponse as { message: string | string[] }).message;
    } else {
      message = 'Internal server error';
    }

    // Full detail goes to server-side logs only — and even there, the logger (nestjs-pino)
    // is configured with redaction paths for known PII field names. Never console.log the
    // raw exception here; that bypasses redaction.
    this.logger.error(
      `${request.method} ${request.url} -> ${status}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
