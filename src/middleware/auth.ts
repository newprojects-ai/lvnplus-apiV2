import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { UnauthorizedError, ValidationError } from '../utils/errors';

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
      throw new UnauthorizedError('Authentication required');
    }

    if (!process.env.JWT_SECRET) {
      throw new ValidationError('JWT_SECRET is not configured');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token');
      } else if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired');
      } else {
        throw new UnauthorizedError('Token validation failed');
      }
    }

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
      throw new UnauthorizedError('Invalid token - User not found');
    }

    if (!user.active) {
      throw new UnauthorizedError('Account is inactive');
    }

    req.user = {
      id: user.user_id,
      email: user.email,
      roles: user.user_roles.map(ur => ur.roles.role_name),
    };

    next();
  } catch (error) {
    next(error);
  }
};

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  const cookieToken = req.cookies?.token;
  return cookieToken || null;
}