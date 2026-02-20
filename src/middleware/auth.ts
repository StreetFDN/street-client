import { Request, Response, NextFunction } from 'express';
import { supabase } from 'services/supabase';
import { AuthenticatedUser } from 'types/authenticatedUser';

/**
 * Middleware to require authentication
 * Tries Supabase JWT auth first, then falls back to session auth
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth!.slice(7) : null;

  if (token === null) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data || !data.user?.id) {
    res.status(401).json({ error: 'Failed to authenticate' });
    return;
  }

  req.userId = data.user.id;
  try {
    req.user = await AuthenticatedUser.loadBySupabaseUser(data.user);
  } catch (error) {
    console.error('Failed to load authenticated user', error);
    res.status(500).json({ error: 'Failed to load authenticated user' });
  }
  return next();
}
