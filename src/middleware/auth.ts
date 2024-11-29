import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { UnauthorizedError } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: bigint;
        email: string;
        roles: string[];
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Authentication configuration error'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    } catch (error) {
      const message = error instanceof jwt.TokenExpiredError 
        ? 'Token expired' 
        : 'Invalid token';
      
      return res.status(401).json({
        error: 'Unauthorized',
        message
      });
    }

    if (!decoded.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token format'
      });
    }

    try {
      const user = await prisma.users.findUnique({
        where: { user_id: BigInt(decoded.userId) },
        include: {
          user_roles: {
            include: {
              roles: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not found'
        });
      }

      if (!user.active) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Account is inactive'
        });
      }

      req.user = {
        id: user.user_id,
        email: user.email,
        roles: user.user_roles.map(ur => ur.roles.role_name),
      };

      next();
    } catch (error) {
      console.error('Database error in auth middleware:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Error validating user authentication'
      });
    }
  } catch (error) {
    console.error('Unexpected error in auth middleware:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication error'
    });
  }
};

function extractToken(req: Request): string | null {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.substring(7);
  }
  
  return req.cookies?.token || null;
}