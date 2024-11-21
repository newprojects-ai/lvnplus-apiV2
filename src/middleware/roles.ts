import { Request, Response, NextFunction } from 'express';

export const checkRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
      });
    }

    next();
  };
};