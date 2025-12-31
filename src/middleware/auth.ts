import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        githubLogin: string;
        name?: string;
        email?: string;
        avatarUrl?: string;
      };
    }
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session || !req.session.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  req.userId = req.session.userId;
  next();
}

/**
 * Middleware to optionally get user (doesn't require auth)
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session && req.session.userId) {
    req.userId = req.session.userId;
  }
  next();
}
