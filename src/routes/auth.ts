import { Router, Request, Response } from 'express';
import { config } from 'config';
import { createClient, requireAuth } from 'middleware/auth';
import { prisma } from 'db';

const router = Router();

/**
 * GET /api/auth/oauth
 * Initiate GitHub OAuth flow
 */
router.get('/oauth', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (code) {
    const supabase = createClient({ req, res });
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      code as string,
    );

    if (!error) {
      // TODO: Create user on the DB, Would be needed to invite clients (since we check for user on DB)

      // Check if the user is SuperUser (Street Team)
      const isSuperUser =
        (await prisma.user.findUnique({
          where: {
            email: data.user.email,
            superUser: true,
          },
        })) !== null;

      if (isSuperUser) {
        return res.redirect(`${config.frontEnd.url}/human/admin-dashboard`); // Update with the URL to client Dashboard
      }

      // Check if authenticated user is an approved client
      // Send to a screen where they can choose client
      const client = await prisma.client.findFirst({
        where: {
          users: {
            some: {
              role: 'ADMIN',
              user: {
                email: data.user.email,
              },
            },
          },
        },
      });

      // Redirect to client to their dashboard page
      if (client != null) {
        return res.redirect(`${config.frontEnd.url}/human/client/dashboard`);
      }

      // Not allow anyone apart from Clients or Superadmins to create account
      return res.redirect(
        `${config.frontEnd.url}/auth/error?error=Not+whitelisted+user`,
      );
    }
  }

  // return the user to an error page with instructions
  return res.redirect(`${config.frontEnd.url}/auth/error`);
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json(req.user);
});

export default router;
