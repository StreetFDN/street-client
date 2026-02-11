import { Maybe } from 'types/utils';

export class RequestError extends Error {
  constructor(message: string, details?: unknown) {
    super(message, { cause: details });
    Object.setPrototypeOf(this, RequestError.prototype);
  }
}

export class XApiError extends Error {
  declare cause: {
    status: number;
    body: Maybe<string>;
  };

  constructor(message: string, status: number, body?: string) {
    super(message, { cause: { status, body } });
    Object.setPrototypeOf(this, XApiError.prototype);
  }
}
