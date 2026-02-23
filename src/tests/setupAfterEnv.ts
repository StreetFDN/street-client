import { resetDatabase } from 'tests/utils/db';
import { prisma } from 'db';

jest.mock('middleware/auth', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireAuth: (req: any, res: any, next: any) => {
    if (!req.userId) {
      return res.status(401).json({ error: 'Access denied' });
    }
    return next();
  },
}));

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
