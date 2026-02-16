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
  try {
    const { code } = req.query;

    if (code) {
      const supabase = createClient({ req, res });
      const {
        data: { user },
        error,
      } = await supabase.auth.exchangeCodeForSession(code as string);
      // User is created on Supabase Servers, so if it's an unauthorized user, we delete it from Supabase AND our DB

      if (!error) {
        if (user === null) {
          return res.redirect(`${config.frontEnd.url}/human/auth/error`);
        }

        let userCreatedInThisApiCall = false;

        // Create User if it doesn't exist
        const userExistsInDB =
          (await prisma.user.findUnique({
            where: {
              email: user.email,
            },
          })) !== null;

        if (!userExistsInDB) {
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.user_metadata.name,
              superUser: config.admin.superUserEmails.has(user.email!),
              supabaseAccount: {
                create: {
                  id: user.id,
                },
              },
            },
          });
          userCreatedInThisApiCall = true;
        }

        // Check if the user is SuperUser (Street Team)
        const isSuperUser =
          (await prisma.user.findUnique({
            where: {
              email: user.email!,
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
                  email: user.email,
                },
              },
            },
          },
        });

        // Redirect to client to their dashboard page
        if (client != null) {
          return res.redirect(`${config.frontEnd.url}/human/client/dashboard`);
        }

        if (userCreatedInThisApiCall) {
          const { data, error } = await supabase.auth.admin.deleteUser(user.id);
          if (data) {
            console.log('Deleted user', data.user);
          } else if (error) {
            console.log('Cannot delete user', error);
            await prisma.user.delete({
              where: {
                supabaseAccountId: user.id,
              },
            });
          }
        }
        // Not allow anyone apart from Clients or Superadmins to create account
        return res.redirect(
          `${config.frontEnd.url}/human/auth/error?error=Not+whitelisted+user`,
        );
      }
    }
  } catch (err) {
    console.error('Error Occured', err);
    return res.redirect(
      `${config.frontEnd.url}/human/auth/error?error=Unexpected+Error.+Please+try+again`,
    );
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json(req.user);
});

export default router;
