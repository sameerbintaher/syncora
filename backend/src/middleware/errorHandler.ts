import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

const JWT_ERRORS = ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'];

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // JWT errors (from passport/jwt or manual verify)
  if (JWT_ERRORS.includes((err as any).name)) {
    const msg = (err as any).name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    res.status(401).json({ status: 'error', message: msg });
    return;
  }

  // Mongoose duplicate key error
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue || {})[0] || 'field';
    res.status(409).json({ status: 'error', message: `${field} already exists` });
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values((err as any).errors).map((e: any) => e.message);
    res.status(400).json({ status: 'error', message: messages.join('. ') });
    return;
  }

  // Mongoose CastError (invalid ObjectId)
  if ((err as any).name === 'CastError') {
    res.status(400).json({ status: 'error', message: 'Invalid ID format' });
    return;
  }

  logger.error('Unhandled error', { err: err.message, stack: err.stack });
  res.status(500).json({ status: 'error', message: 'Internal server error' });
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
}
