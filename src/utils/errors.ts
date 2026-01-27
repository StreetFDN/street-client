export class RequestError extends Error {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(message: string, details?: any) {
    super(message, { cause: details });
    Object.setPrototypeOf(this, RequestError.prototype);
  }
}
