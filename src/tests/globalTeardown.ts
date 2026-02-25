import { readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const TEST_CONTAINER_FILE = join(process.cwd(), '.testcontainers.json');

export default async function globalTeardown(): Promise<void> {
  try {
    const raw = readFileSync(TEST_CONTAINER_FILE, 'utf-8');
    const data = JSON.parse(raw) as { containerId?: string };
    if (data.containerId) {
      execSync(`docker rm -f ${data.containerId}`, { stdio: 'inherit' });
    }
  } finally {
    try {
      unlinkSync(TEST_CONTAINER_FILE);
    } catch {
      // ignore
    }
  }
}
