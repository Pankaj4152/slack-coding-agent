import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

export function createGithubClient(options: {
  appId: number;
  installationId: number;
  privateKey: string;
}): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: options.appId,
      installationId: options.installationId,
      privateKey: options.privateKey,
    },
  });
}
