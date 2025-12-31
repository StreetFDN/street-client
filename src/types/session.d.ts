// Type definitions for express-session
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    user?: {
      id: string;
      githubLogin: string;
      name?: string;
      email?: string;
      avatarUrl?: string;
    };
    oauthState?: string;
  }
}
