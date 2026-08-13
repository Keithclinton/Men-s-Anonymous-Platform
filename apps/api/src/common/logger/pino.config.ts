import { Params } from 'nestjs-pino';

/**
 * Structured logging with PII redaction baked in. New sensitive field names should be
 * added here as they show up — this is the one place that decides what never reaches
 * a log line or an error-tracking service. See ARCHITECTURE.md §6.
 */
export const pinoConfig: Params = {
  pinoHttp: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.email',
        'req.body.phone',
        'req.body.phoneNumber',
        'req.body.name',
        'req.body.fullName',
        'req.body.token',
        '*.encryptedName',
        '*.encryptedEmail',
        '*.encryptedPhone',
        '*.encryptedPaymentRef',
        '*.encryptedLicenseNumber',
      ],
      censor: '[REDACTED]',
    },
    autoLogging: true,
  },
};
