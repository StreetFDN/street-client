import { resetDatabase } from 'tests/utils/db';
import { prisma } from 'db';

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
