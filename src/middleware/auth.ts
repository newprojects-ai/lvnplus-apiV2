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
    console.log('Authentication Middleware - Token:', token ? 'Present' : 'Missing');

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Authentication configuration error'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
      console.log('Authentication Middleware - Token decoded:', JSON.stringify(decoded, null, 2));
    } catch (error) {
      const message = error instanceof jwt.TokenExpiredError 
        ? 'Token expired' 
        : 'Invalid token';
      
      return res.status(401).json({
        error: 'Unauthorized',
        message
      });
    }

    // Ensure we have a valid user ID
    const userId = decoded.userId ? BigInt(decoded.userId) : null;
    const userEmail = decoded.email;

    if (!userId && !userEmail) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token format'
      });
    }

    // Fetch user details from database to ensure they still exist and get latest roles
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          userId ? { user_id: userId } : {},
          userEmail ? { email: userEmail } : {}
        ]
      },
      include: {
        user_roles: {
          include: {
            roles: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    // Attach user to request
    req.user = {
      id: user.user_id,
      email: user.email,
      roles: user.user_roles.map(ur => ur.roles.role_name)
    };

    next();
  } catch (error) {
    console.error('Authentication Middleware - Unexpected error:', error);
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