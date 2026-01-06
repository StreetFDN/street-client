import { Request, Response, NextFunction } from 'express';
import { trySupabaseAuth } from './supabaseAuth';

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
 * Tries Supabase JWT auth first, then falls back to session auth
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // First try Supabase auth
  const supabaseAuthSuccess = await trySupabaseAuth(req);
  
  if (supabaseAuthSuccess) {
    return next();
  }

  // Otherwise, try session auth
  if (req.session && req.session.userId) {
    req.userId = req.session.userId;
    if (req.session.user) {
      req.user = req.session.user;
    }
    return next();
  }

  // No authentication found
  res.status(401).json({ error: 'Authentication required' });
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



