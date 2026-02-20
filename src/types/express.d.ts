import 'express';

import { AuthenticatedUser } from 'types/authenticatedUser';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: AuthenticatedUser;
    }
  }
}

export {};
