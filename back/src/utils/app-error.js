class AppError extends Error {
  constructor(statusCode, message, code = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

AppError.AppError = AppError;
module.exports = AppError;

