import { prisma } from 'db';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to ensure that the token to be searched exists in the database.
 */
export async function requireTokenExists(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { tokenAddress } = req.params;
  const token = await prisma.token.findUnique({
    where: { address: tokenAddress },
  });

  if (token === null) {
    res.status(404).json({ error: "Token doesn't exist" });
    return;
  }

  return next();
}
