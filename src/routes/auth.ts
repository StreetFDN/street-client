import { Router, Request, Response } from 'express';
import { config } from 'config';
import { createClient } from 'middleware/auth';

const router = Router();

/**
 * GET /api/auth/oauth
 * Initiate GitHub OAuth flow
 */
router.get('/oauth', async (req: Request, res: Response) => {
  const { code, next } = req.query;

  if (code) {
    const supabase = createClient({ req, res });
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      code as string,
    );

    if (!error) {
      const user = data.user;
      console.log('Supabase Authenticated User', user);

      // TODO: Perform checks on User permission and redirect accordingly
      const isUserAllowed = true;

      if (!isUserAllowed) {
        return res.redirect(
          `${config.frontEnd.url}/auth/error?error=Not+whitelisted+user`,
        );
      }

      const forwardedHost = req.headers['x-forwarded-host'] as
        | string
        | undefined;
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return res.redirect(`${config.frontEnd.url}${next ?? ''}`);
      } else if (forwardedHost) {
        return res.redirect(`https://${forwardedHost}${next ?? ''}`);
      } else {
        return res.redirect(`${config.frontEnd.url}${next ?? ''}`);
      }
    }
  }

  // return the user to an error page with instructions
  return res.redirect(`${config.frontEnd.url}/auth/error`);
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', (req: Request, res: Response) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json(req.session.user || { id: req.session.userId });
});

export default router;
