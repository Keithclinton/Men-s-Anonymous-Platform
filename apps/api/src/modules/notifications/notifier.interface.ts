export interface NotificationPayload {
  /** Email address or phone number — already resolved from the vault by the caller. */
  to: string;
  channel: 'email' | 'sms' | 'push';
  template: string;
  data?: Record<string, unknown>;
}

export interface Notifier {
  send(payload: NotificationPayload): Promise<void>;
}

export const NOTIFIER = Symbol('NOTIFIER');
