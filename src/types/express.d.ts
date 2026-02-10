import 'express';

import { User as SupabaseUser } from '@supabase/auth-js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: SupabaseUser;
    }
  }
}

export {};
