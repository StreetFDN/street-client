import 'express';

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

export {};
