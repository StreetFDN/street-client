import { Request } from 'express';
//
// Initialize Supabase client (only if URL and key are provided)
// const supabase =
//   config.supabase.url && config.supabase.anonKey
//     ? createClient(config.supabase.url, config.supabase.anonKey)
//     : null;

/**
 * Attempts to authenticate using Supabase JWT token
 * Returns true if authentication succeeded and set req.userId, false otherwise
 */
//
export async function trySupabaseAuth(_req: Request): Promise<boolean> {
  // TODO(mlacko): Finish this
  throw new Error('Not Implemented');
  // // If Supabase is not configured, skip
  // if (!supabase) {
  //   return false;
  // }
  //
  // // Try to get Supabase JWT from Authorization header
  // const authHeader = req.headers.authorization;
  // if (!authHeader || !authHeader.startsWith('Bearer ')) {
  //   return false;
  // }
  //
  // const token = authHeader.substring(7);
  //
  // try {
  //   // Verify the JWT token with Supabase
  //   const {
  //     data: { user },
  //     error,
  //   } = await supabase.auth.getUser(token);
  //
  //   if (error || !user) {
  //     return false;
  //   }
  //
  //   // Try to find user by Supabase ID first
  //   let backendUser = await prisma.user.findUnique({
  //     where: { supabaseId: user.id },
  //   });
  //
  //   // If not found, try to find by email
  //   if (!backendUser && user.email) {
  //     backendUser = await prisma.user.findFirst({
  //       where: {
  //         email: user.email,
  //       },
  //     });
  //   }
  //
  //   // If not found, try to find by GitHub login (if user has GitHub provider)
  //   if (!backendUser && user.app_metadata?.provider === 'github') {
  //     const githubLogin =
  //       user.user_metadata?.user_name || user.user_metadata?.preferred_username;
  //
  //     if (githubLogin) {
  //       backendUser = await prisma.user.findFirst({
  //         where: {
  //           githubLogin: githubLogin,
  //         },
  //       });
  //     }
  //   }
  //
  //   // If still not found, create a new user
  //   if (!backendUser) {
  //     const githubLogin =
  //       user.user_metadata?.user_name ||
  //       user.user_metadata?.preferred_username ||
  //       (user.email ? user.email.split('@')[0] : null);
  //
  //     backendUser = await prisma.user.create({
  //       data: {
  //         email: user.email || undefined,
  //         name:
  //           user.user_metadata?.full_name ||
  //           user.user_metadata?.name ||
  //           (user.email ? user.email.split('@')[0] : null) ||
  //           'User',
  //         githubLogin: githubLogin || undefined,
  //         avatarUrl: user.user_metadata?.avatar_url || undefined,
  //         supabaseId: user.id,
  //       },
  //     });
  //   } else if (!backendUser.supabaseId) {
  //     // Link existing user to Supabase
  //     backendUser = await prisma.user.update({
  //       where: { id: backendUser.id },
  //       data: { supabaseId: user.id },
  //     });
  //   }
  //
  //   // Set userId for the request (same as session auth)
  //   req.userId = backendUser.id;
  //   req.user = {
  //     id: backendUser.id,
  //     githubLogin: backendUser.githubLogin || '',
  //     name: backendUser.name || undefined,
  //     email: backendUser.email || undefined,
  //     avatarUrl: backendUser.avatarUrl || undefined,
  //   };
  //
  //   return true;
  // } catch (error) {
  //   console.error('Error verifying Supabase token:', error);
  //   return false;
  // }
}
