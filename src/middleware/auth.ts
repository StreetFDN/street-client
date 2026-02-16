import { Request, Response, NextFunction } from 'express';
import {
  CookieOptions,
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr';
import { config } from 'config';

/**
 * Middleware to require authentication
 * Tries Supabase JWT auth first, then falls back to session auth
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const supabase = createClient({ req, res });
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    req.userId = data.user.id;
    req.user = data.user;
    return next();
  }

  // No authentication found
  res.status(401).json({ error: 'Authentication required' });
}

/**
 * Middleware to optionally get user (doesn't require auth)
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const supabase = createClient({ req, res });
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    req.userId = data.user.id;
    req.user = data.user;
  }
  next();
}

// Always create a new server client instance, instead of sharing one common instance across code
export const createClient = (context: { req: Request; res: Response }) => {
  return createServerClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(context.req.headers.cookie ?? '')
            .filter(
              (cookie): cookie is { name: string; value: string } =>
                cookie.value != null,
            )
            .map((cookie) => ({ name: cookie.name, value: cookie.value }));
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value, options }) =>
            context.res.append(
              'Set-Cookie',
              serializeCookieHeader(name, value, options),
            ),
          );
        },
      },
    },
  );
};
