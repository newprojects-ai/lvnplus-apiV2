import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { UnauthorizedError, ValidationError, NotFoundError } from '../utils/errors';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error details:', {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });

  // Handle custom errors
  if (error instanceof UnauthorizedError) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: error.message || 'Authentication required',
    });
  }

  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message || 'Invalid input data',
    });
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({
      error: 'Not Found',
      message: error.message || 'Resource not found',
    });
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return res.status(409).json({
          error: 'Unique constraint violation',
          message: 'A record with this data already exists',
          field: error.meta?.target,
        });
      case 'P2025':
        return res.status(404).json({
          error: 'Not found',
          message: 'The requested resource was not found',
        });
      default:
        return res.status(400).json({
          error: 'Database error',
          message: process.env.NODE_ENV === 'development' ? `Database error: ${error.code}` : 'Database operation failed',
        });
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid data provided to database operation',
    });
  }

  return res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { details: error.message }),
  });
};