import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return res.status(409).json({
          error: 'Unique constraint violation',
          message: 'A record with this data already exists',
        });
      case 'P2025':
        return res.status(404).json({
          error: 'Not found',
          message: 'The requested resource was not found',
        });
      default:
        return res.status(400).json({
          error: 'Database error',
          message: 'An error occurred while processing your request',
        });
    }
  }

  return res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
  });
};