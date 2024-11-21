import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

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
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    // TODO: Implement proper JWT verification
    const userId = BigInt(1); // Temporary for testing

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      roles: user.userRoles.map(ur => ur.role.name),
    };

    next();
  } catch (error) {
    next(error);
  }
};