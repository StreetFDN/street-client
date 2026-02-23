import { prisma } from 'db';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if tokens to be searched are authorized
 */
export async function requireAuthorizedToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { tokenAddress } = req.params;
  const token = await prisma.token.findUnique({
    where: { address: tokenAddress },
  });

  if (token === null) {
    res.status(403).json({ error: 'Unauthorized token address' });
    return;
  }

  return next();
}
