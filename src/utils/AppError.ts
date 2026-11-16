/**
 * An error with an HTTP status that is safe to show to the client.
 * Throw it from any controller wrapped in catchAsync; the global
 * errorHandler turns it into `{ message }` with the right status.
 */
export class AppError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode = 400, code?: string) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}
