import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { config } from '../../config';

/**
 * Creates an Octokit instance authenticated as the GitHub App
 * for installation-level API calls
 */
export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const auth = createAppAuth({
    appId: config.github.appId,
    privateKey: config.github.privateKey,
  });

  const { token } = await auth({
    type: 'installation',
    installationId,
  });

  return new Octokit({
    auth: token,
  });
}

/**
 * Creates an Octokit instance authenticated as the GitHub App
 * for app-level API calls (before installation)
 */
export async function getAppOctokit(): Promise<Octokit> {
  const auth = createAppAuth({
    appId: config.github.appId,
    privateKey: config.github.privateKey,
  });

  const { token } = await auth({
    type: 'app',
  });

  return new Octokit({
    auth: token,
  });
}
