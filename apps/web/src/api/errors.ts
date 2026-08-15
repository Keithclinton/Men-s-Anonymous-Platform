export class ApiError extends Error {
  readonly statusCode: number;
  readonly messages: string[];

  constructor(statusCode: number, messages: string[]) {
    super(messages.join(' '));
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.messages = messages;
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  get isConflict(): boolean {
    return this.statusCode === 409;
  }

  get isRateLimited(): boolean {
    return this.statusCode === 429;
  }
}

export function parseApiError(status: number, body: unknown): ApiError {
  if (status === 429) {
    return new ApiError(429, ['Too many attempts. Wait a minute, then try again.']);
  }

  const message =
    body && typeof body === 'object' && 'message' in body
      ? (body as { message: unknown }).message
      : null;

  const messages = Array.isArray(message)
    ? message.map(String)
    : [String(message ?? `Something went wrong (${status}).`)];

  return new ApiError(status, messages);
}

export function networkError(): ApiError {
  return new ApiError(0, [
    'Can’t reach the server. Check your connection, or that the API is running.',
  ]);
}
