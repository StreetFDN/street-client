export class RequestError extends Error {
  constructor(message: string, details?: any) {
    super(message, { cause: details });
    Object.setPrototypeOf(this, RequestError.prototype);
  }
}
