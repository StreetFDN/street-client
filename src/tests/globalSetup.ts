import { writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const TEST_CONTAINER_FILE = join(process.cwd(), '.testcontainers.json');

export default async function globalSetup(): Promise<void> {
  if (typeof (globalThis as { File?: unknown }).File === 'undefined') {
    (globalThis as { File?: unknown }).File = class {};
  }

  const { GenericContainer } = await import('testcontainers');
  const container = await new GenericContainer('postgres:15-alpine')
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_DB: 'street_client_test',
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
    })
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(5432);
  const databaseUrl = `postgresql://test:test@${host}:${port}/street_client_test?schema=public`;

  writeFileSync(
    TEST_CONTAINER_FILE,
    JSON.stringify({ containerId: container.getId(), databaseUrl }),
  );

  execSync('npx prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: 'inherit',
  });
}
